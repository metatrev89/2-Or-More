import type { TTSProvider, ImageProvider, VideoProvider } from '../types.js';
import { config } from '../../config.js';

/**
 * Live media adapters — skeletons with verified pricing baked into cost
 * telemetry. Endpoint shapes marked VERIFY need a check against current
 * vendor docs before production (they drift).
 */

// ── Fish Audio: TTS + voice clone ($15/1M chars, $0.10/clone) ─────────
export class FishAudioTTS implements TTSProvider {
  private base = 'https://api.fish.audio/v1'; // VERIFY

  async cloneVoice(sampleAudio: Uint8Array, userRef: string) {
    const form = new FormData();
    form.append('title', `twoplus-${userRef}`);
    form.append('voices', new Blob([sampleAudio.buffer as ArrayBuffer]), 'sample.wav');
    const res = await fetch(`${this.base}/model`, {
      method: 'POST', headers: { authorization: `Bearer ${config.fishApiKey}` }, body: form,
    });
    if (!res.ok) throw new Error(`Fish clone error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { _id: string };
    return { voiceId: data._id, costUsd: 0.10 };
  }

  async synthesize(text: string, voiceId: string | 'default') {
    const res = await fetch(`${this.base}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.fishApiKey}`, model: 's2-pro' },
      body: JSON.stringify({ text, reference_id: voiceId === 'default' ? undefined : voiceId, format: 'mp3' }),
    });
    if (!res.ok) throw new Error(`Fish TTS error ${res.status}: ${await res.text()}`);
    const audio = new Uint8Array(await res.arrayBuffer());
    return { audio, format: 'mp3' as const, costUsd: (text.length / 1_000_000) * 15 };
  }

  async deleteVoice(voiceId: string) {
    // BIPA deletion path — must actually delete at the vendor.
    const res = await fetch(`${this.base}/model/${voiceId}`, {
      method: 'DELETE', headers: { authorization: `Bearer ${config.fishApiKey}` },
    });
    if (!res.ok && res.status !== 404) throw new Error(`Fish delete error ${res.status}`);
  }
}

// ── FLUX.2 via fal (~$0.03/MP) ────────────────────────────────────────
export class FalFluxImage implements ImageProvider {
  async generate(prompt: string, opts: { referenceImages?: Uint8Array[]; aspect: '9:16' | '1:1' }) {
    const body: Record<string, unknown> = {
      prompt,
      image_size: opts.aspect === '9:16' ? { width: 768, height: 1344 } : { width: 1024, height: 1024 },
    };
    if (opts.referenceImages?.length) {
      body.reference_images = opts.referenceImages.map(b => `data:image/jpeg;base64,${Buffer.from(b).toString('base64')}`); // VERIFY param name
    }
    const res = await fetch('https://fal.run/fal-ai/flux-2', { // VERIFY model path
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Key ${config.falApiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`fal FLUX error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { images: { url: string }[] };
    const imgRes = await fetch(data.images[0]!.url);
    return { image: new Uint8Array(await imgRes.arrayBuffer()), format: 'jpg' as const, costUsd: 0.03 };
  }
}

// ── Video: LTX-2.3 (primary candidate) and Wan via fal (bake-off) ────
export class LTXVideo implements VideoProvider {
  readonly vendorName = 'ltx-2.3';
  async imageToVideo(image: Uint8Array, prompt: string, opts: { seconds: number; resolution: '720p' | '1080p' }) {
    const res = await fetch('https://api.ltx.video/v1/image-to-video', { // VERIFY base URL from docs.ltx.video
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.ltxApiKey}` },
      body: JSON.stringify({
        model: 'ltx-2.3-fast',
        image: `data:image/jpeg;base64,${Buffer.from(image).toString('base64')}`,
        prompt,
        duration: opts.seconds,
        resolution: opts.resolution === '1080p' ? '1920x1080' : '1280x720',
      }),
    });
    if (!res.ok) throw new Error(`LTX error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { video_url: string };
    const vidRes = await fetch(data.video_url);
    return {
      video: new Uint8Array(await vidRes.arrayBuffer()), format: 'mp4' as const,
      costUsd: opts.seconds * 0.06, // LTX-2.3 Fast @1080p, verified 2026-07-09
    };
  }
}

export class WanVideo implements VideoProvider {
  readonly vendorName = 'wan-2.5';
  async imageToVideo(image: Uint8Array, prompt: string, opts: { seconds: number; resolution: '720p' | '1080p' }) {
    const res = await fetch('https://fal.run/fal-ai/wan-i2v', { // VERIFY model path
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Key ${config.falApiKey}` },
      body: JSON.stringify({
        image_url: `data:image/jpeg;base64,${Buffer.from(image).toString('base64')}`,
        prompt, duration: opts.seconds,
      }),
    });
    if (!res.ok) throw new Error(`fal Wan error ${res.status}: ${await res.text()}`);
    const data = await res.json() as { video: { url: string } };
    const vidRes = await fetch(data.video.url);
    return {
      video: new Uint8Array(await vidRes.arrayBuffer()), format: 'mp4' as const,
      costUsd: opts.seconds * 0.05, // Wan 2.5 via fal, verified 2026-07-09
    };
  }
}
