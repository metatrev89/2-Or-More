import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * ffmpeg stitching — the $0 assembly step. Runs identically in the
 * Cloudflare Container, on Railway/Fly, or locally.
 * Clips are concatenated, the affirmation audio track is overlaid,
 * output is portrait 1080x1920 H.264.
 */

/** Probe media duration in seconds via ffprobe (ships with ffmpeg). */
export async function probeDuration(data: Uint8Array, ext: string): Promise<number> {
  const p = join(tmpdir(), `twoplus-probe-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  await writeFile(p, data);
  try {
    return await new Promise<number>((resolve, reject) => {
      const proc = spawn('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]);
      let out = '';
      proc.stdout.on('data', d => { out += d; });
      proc.on('error', reject);
      proc.on('exit', code => {
        const dur = parseFloat(out.trim());
        if (code === 0 && Number.isFinite(dur)) resolve(dur);
        else reject(new Error(`ffprobe failed (code ${code}, out "${out.trim()}")`));
      });
    });
  } finally {
    await rm(p, { force: true });
  }
}

/**
 * Scene length from its audio duration — the audio is the guideline, the
 * clamp is the cost guardrail (video bills per second).
 */
export function sceneSecondsForAudio(audioSeconds: number, opts?: { min?: number; max?: number }): number {
  const min = opts?.min ?? 3;
  const max = opts?.max ?? 8;
  return Math.min(max, Math.max(min, Math.ceil(audioSeconds)));
}

/** Concatenate audio segments into one continuous track (free — no second TTS call). */
export async function concatAudio(segments: Uint8Array[], format: 'mp3' | 'wav'): Promise<Uint8Array> {
  const work = join(tmpdir(), `twoplus-audiocat-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(work, { recursive: true });
  try {
    const paths: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const p = join(work, `seg${i}.${format}`);
      await writeFile(p, segments[i]!);
      paths.push(p);
    }
    const listPath = join(work, 'list.txt');
    await writeFile(listPath, paths.map(p => `file '${p}'`).join('\n'));
    const out = join(work, `full.${format}`);
    await run(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', out]);
    return new Uint8Array(await readFile(out));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Mux one scene clip with its own audio segment (the per-affirmation playable). */
export async function muxClipWithAudio(clip: Uint8Array, audio: Uint8Array, audioFormat: 'mp3' | 'wav'): Promise<Uint8Array> {
  const work = join(tmpdir(), `twoplus-mux-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(work, { recursive: true });
  try {
    const clipPath = join(work, 'clip.mp4');
    const audioPath = join(work, `audio.${audioFormat}`);
    const outPath = join(work, 'scene.mp4');
    await writeFile(clipPath, clip);
    await writeFile(audioPath, audio);
    await run([
      '-i', clipPath, '-i', audioPath,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-shortest', outPath,
    ]);
    return new Uint8Array(await readFile(outPath));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export function ffmpegAvailable(): Promise<boolean> {
  return new Promise(resolve => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => resolve(false));
    p.on('exit', code => resolve(code === 0));
  });
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('exit', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-800)}`))));
  });
}

export interface StitchInput {
  clips: Uint8Array[];        // mp4 clips, one per scene
  audio: Uint8Array | null;   // affirmation audio track (mp3/wav); null -> silent
  audioFormat?: 'mp3' | 'wav';
}

export async function stitchMindMovie(input: StitchInput): Promise<Uint8Array> {
  const work = join(tmpdir(), `twoplus-stitch-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(work, { recursive: true });
  try {
    const clipPaths: string[] = [];
    for (let i = 0; i < input.clips.length; i++) {
      const p = join(work, `clip${i}.mp4`);
      await writeFile(p, input.clips[i]!);
      clipPaths.push(p);
    }

    // Normalize every clip to portrait 1080x1920 30fps so concat never fails on mismatched streams.
    const normPaths: string[] = [];
    for (let i = 0; i < clipPaths.length; i++) {
      const out = join(work, `norm${i}.mp4`);
      await run([
        '-i', clipPaths[i]!,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30',
        '-an', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', out,
      ]);
      normPaths.push(out);
    }

    const listPath = join(work, 'list.txt');
    await writeFile(listPath, normPaths.map(p => `file '${p}'`).join('\n'));
    const concatPath = join(work, 'concat.mp4');
    await run(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', concatPath]);

    const finalPath = join(work, 'final.mp4');
    if (input.audio) {
      const audioPath = join(work, `audio.${input.audioFormat ?? 'mp3'}`);
      await writeFile(audioPath, input.audio);
      await run([
        '-i', concatPath, '-i', audioPath,
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-shortest', finalPath,
      ]);
    } else {
      await run(['-i', concatPath, '-c', 'copy', finalPath]);
    }

    return new Uint8Array(await readFile(finalPath));
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** Test helper: generate a real color clip + tone so the demo produces a playable mp4 with zero vendors. */
export async function generateTestClip(color: string, seconds: number): Promise<Uint8Array> {
  const out = join(tmpdir(), `twoplus-test-${color}-${Date.now()}.mp4`);
  await run([
    '-f', 'lavfi', '-i', `color=c=${color}:s=540x960:d=${seconds}`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', out,
  ]);
  const data = new Uint8Array(await readFile(out));
  await rm(out, { force: true });
  return data;
}

export async function generateTestAudio(seconds: number): Promise<Uint8Array> {
  const out = join(tmpdir(), `twoplus-testaudio-${Date.now()}.mp3`);
  await run([
    '-f', 'lavfi', '-i', `sine=frequency=220:duration=${seconds}`,
    '-c:a', 'libmp3lame', out,
  ]);
  const data = new Uint8Array(await readFile(out));
  await rm(out, { force: true });
  return data;
}
