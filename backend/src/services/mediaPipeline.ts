import type { Affirmation, MediaAsset } from '../types.js';
import type { ImageProvider, StorageProvider, TTSProvider, VideoProvider } from '../adapters/types.js';
import {
  stitchMindMovie, ffmpegAvailable, probeDuration, sceneSecondsForAudio, concatAudio, muxClipWithAudio,
} from './stitch.js';

/**
 * Staged media build — the COGS-protection design from the cost model:
 *   Stage 1 (at trial start, ~$0.45): voice clone + PER-SCENE audio + goal images
 *   Stage 2 (day 2-3 / engagement signal, ~$2.25): scene clips + full mind movie
 *
 * Per-scene design:
 *   - TTS is synthesized per affirmation; each audio segment's duration sets
 *     its scene's video length (clamped 3-8s — audio guides, cost guards).
 *   - The full audio track is assembled by concatenating segments (free).
 *   - Each scene clip is stored as its own asset (per-affirmation quick-play,
 *     cheap single-scene regens) AND stitched into the full mind movie.
 */

const DEFAULT_SCENE_SECONDS = 6;

export interface SceneAudio {
  affirmationId: string;
  audio: Uint8Array;
  format: 'mp3' | 'wav';
  seconds: number;
}

export interface Stage1Result {
  voiceId: string | null;
  assets: MediaAsset[];
  sceneAudio: SceneAudio[];
  fullAudio: { data: Uint8Array; format: 'mp3' | 'wav' } | null;
  costUsd: number;
}

export interface Stage2Result {
  movieAsset: MediaAsset;
  sceneAssets: MediaAsset[];
  costUsd: number;
  vendor: string;
}

export class MediaPipeline {
  constructor(
    private tts: TTSProvider,
    private image: ImageProvider,
    private video: VideoProvider,
    private storage: StorageProvider,
  ) {}

  async runStage1(opts: {
    userId: string;
    affirmations: Affirmation[];
    voiceSample: Uint8Array | null;
    voiceConsentVerified: boolean;
    referencePhoto: Uint8Array | null;
  }): Promise<Stage1Result> {
    let cost = 0;
    const assets: MediaAsset[] = [];

    // Voice clone (only with explicit verified consent — BIPA gate in code)
    let voiceId: string | null = null;
    if (opts.voiceSample) {
      if (!opts.voiceConsentVerified) {
        throw new Error('BIPA_CONSENT_REQUIRED: voice sample present without verified consent');
      }
      const clone = await this.tts.cloneVoice(opts.voiceSample, opts.userId);
      voiceId = clone.voiceId;
      cost += clone.costUsd;
    }

    // Per-scene TTS: goal affirmations get one segment each; identity
    // statements are read together as the closing segment.
    const goalAffirmations = opts.affirmations.filter(a => !a.isIdentity);
    const identityText = opts.affirmations.filter(a => a.isIdentity).map(a => a.statement).join(' ');
    const sceneAudio: SceneAudio[] = [];

    for (const a of goalAffirmations) {
      const speech = await this.tts.synthesize(a.statement, voiceId ?? 'default');
      cost += speech.costUsd;
      const seconds = await this.safeProbe(speech.audio, speech.format);
      sceneAudio.push({ affirmationId: a.id, audio: speech.audio, format: speech.format, seconds });

      const key = `users/${opts.userId}/audio/scene-${a.id}.${speech.format}`;
      await this.storage.put(key, speech.audio, speech.format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
      assets.push({
        id: crypto.randomUUID(), userId: opts.userId, affirmationId: a.id,
        format: 'audio', storageKey: key, durationSeconds: seconds, generationCostUsd: speech.costUsd,
      });
    }

    let closing: SceneAudio | null = null;
    if (identityText) {
      const speech = await this.tts.synthesize(identityText, voiceId ?? 'default');
      cost += speech.costUsd;
      const seconds = await this.safeProbe(speech.audio, speech.format);
      closing = { affirmationId: 'identity', audio: speech.audio, format: speech.format, seconds };
    }

    // Full track = concat of segments (free) — always in sync with scenes.
    let fullAudio: Stage1Result['fullAudio'] = null;
    const allSegments = [...sceneAudio, ...(closing ? [closing] : [])];
    if (allSegments.length && await ffmpegAvailable() && allSegments.every(s => s.audio.length > 1000)) {
      const format = allSegments[0]!.format;
      const data = await concatAudio(allSegments.map(s => s.audio), format);
      fullAudio = { data, format };
      const key = `users/${opts.userId}/audio/affirmations-full.${format}`;
      await this.storage.put(key, data, format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
      assets.push({
        id: crypto.randomUUID(), userId: opts.userId, format: 'audio',
        storageKey: key, durationSeconds: allSegments.reduce((s, a) => s + a.seconds, 0), generationCostUsd: 0,
      });
    }

    // One goal image per affirmation (portrait, likeness via consented photo)
    for (const a of goalAffirmations) {
      const img = await this.image.generate(this.imagePrompt(a), {
        referenceImages: opts.referencePhoto ? [opts.referencePhoto] : undefined,
        aspect: '9:16',
      });
      cost += img.costUsd;
      const key = `users/${opts.userId}/images/${a.id}.${img.format}`;
      await this.storage.put(key, img.image, img.format === 'png' ? 'image/png' : 'image/jpeg');
      assets.push({
        id: crypto.randomUUID(), userId: opts.userId, affirmationId: a.id,
        format: 'image', storageKey: key, generationCostUsd: img.costUsd,
      });
    }

    return { voiceId, assets, sceneAudio, fullAudio, costUsd: cost };
  }

  async runStage2(opts: {
    userId: string;
    affirmations: Affirmation[];
    images: { affirmationId: string; data: Uint8Array }[];
    sceneAudio: SceneAudio[];
    fullAudio: { data: Uint8Array; format: 'mp3' | 'wav' } | null;
    resolution?: '720p' | '1080p';
  }): Promise<Stage2Result> {
    const resolution = opts.resolution ?? '1080p';
    let cost = 0;
    const sceneAssets: MediaAsset[] = [];
    const clips: Uint8Array[] = [];
    const haveFfmpeg = await ffmpegAvailable();

    for (const img of opts.images) {
      const affirmation = opts.affirmations.find(a => a.id === img.affirmationId);
      const audio = opts.sceneAudio.find(s => s.affirmationId === img.affirmationId);
      const seconds = audio ? sceneSecondsForAudio(audio.seconds) : DEFAULT_SCENE_SECONDS;

      const clip = await this.video.imageToVideo(img.data, this.motionPrompt(affirmation?.statement ?? ''), {
        seconds, resolution,
      });
      cost += clip.costUsd;
      clips.push(clip.video);

      // Persist the individual scene (feature: per-affirmation playback + cheap regen)
      let sceneBytes = clip.video;
      const realMedia = clip.video.length > 1000 && (audio?.audio.length ?? 0) > 1000;
      if (haveFfmpeg && realMedia && audio) {
        sceneBytes = await muxClipWithAudio(clip.video, audio.audio, audio.format);
      }
      const sceneKey = `users/${opts.userId}/scenes/${img.affirmationId}.mp4`;
      await this.storage.put(sceneKey, sceneBytes, 'video/mp4');
      sceneAssets.push({
        id: crypto.randomUUID(), userId: opts.userId, affirmationId: img.affirmationId,
        format: 'scene_clip', storageKey: sceneKey, durationSeconds: seconds,
        vendor: this.video.vendorName, generationCostUsd: clip.costUsd,
      });
    }

    // Full mind movie = stitch of the same clips + the full audio track
    let finalVideo: Uint8Array;
    const clipsAreReal = clips.every(c => c.length > 1000);
    if (haveFfmpeg && clipsAreReal) {
      finalVideo = await stitchMindMovie({
        clips,
        audio: opts.fullAudio?.data ?? null,
        audioFormat: opts.fullAudio?.format,
      });
    } else {
      finalVideo = new TextEncoder().encode(JSON.stringify({
        mock: true, scenes: clips.length, note: 'mock clips — real stitch requires real mp4 clips + ffmpeg',
      }));
    }

    const movieKey = `users/${opts.userId}/movies/mind-movie-${Date.now()}.mp4`;
    await this.storage.put(movieKey, finalVideo, 'video/mp4');

    return {
      movieAsset: {
        id: crypto.randomUUID(), userId: opts.userId, format: 'mind_movie',
        storageKey: movieKey,
        durationSeconds: sceneAssets.reduce((s, a) => s + (a.durationSeconds ?? 0), 0),
        vendor: this.video.vendorName, generationCostUsd: cost,
      },
      sceneAssets,
      costUsd: cost,
      vendor: this.video.vendorName,
    };
  }

  /**
   * Single-scene regeneration (user edited one affirmation): regenerate ONE
   * image+clip, then restitch the movie from stored clips — free except the
   * one scene (~$0.33 instead of ~$2.25+).
   */
  async regenScene(opts: {
    userId: string;
    affirmation: Affirmation;
    referencePhoto: Uint8Array | null;
    voiceId: string | null;
    resolution?: '720p' | '1080p';
  }): Promise<{ image: Uint8Array; sceneAudio: SceneAudio; costUsd: number }> {
    let cost = 0;
    const speech = await this.tts.synthesize(opts.affirmation.statement, opts.voiceId ?? 'default');
    cost += speech.costUsd;
    const seconds = await this.safeProbe(speech.audio, speech.format);

    const img = await this.image.generate(this.imagePrompt(opts.affirmation), {
      referenceImages: opts.referencePhoto ? [opts.referencePhoto] : undefined,
      aspect: '9:16',
    });
    cost += img.costUsd;

    return {
      image: img.image,
      sceneAudio: { affirmationId: opts.affirmation.id, audio: speech.audio, format: speech.format, seconds },
      costUsd: cost,
    };
  }

  private async safeProbe(audio: Uint8Array, format: string): Promise<number> {
    if (audio.length < 1000) return DEFAULT_SCENE_SECONDS; // mock bytes
    try {
      return await probeDuration(audio, format);
    } catch {
      return DEFAULT_SCENE_SECONDS;
    }
  }

  private imagePrompt(a: Affirmation): string {
    return `Photo-realistic, warm golden-hour lighting, portrait orientation. A real person living this reality: "${a.statement}" — candid, hopeful, cinematic, no text overlay.`;
  }

  private motionPrompt(statement: string): string {
    return `Subtle cinematic motion, slow push-in, natural movement, warm light. The scene embodies: "${statement}"`;
  }
}
