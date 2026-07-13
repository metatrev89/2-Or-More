import { config } from '../config.js';
import type {
  IntakeLLM, RewriteLLM, TTSProvider, ImageProvider, VideoProvider, StorageProvider,
} from './types.js';
import {
  MockIntakeLLM, MockRewriteLLM, MockTTS, MockImage, MockVideo, LocalStorageProvider,
} from './mock.js';

/**
 * Provider factory. Live implementations are imported lazily so mock-mode
 * (local dev, CI, the demo) never touches vendor SDK code paths.
 */

export async function getIntakeLLM(): Promise<IntakeLLM> {
  if (config.providers.intakeLLM === 'live') {
    const { SparkIntakeLLM } = await import('./live/llm.js');
    return new SparkIntakeLLM();
  }
  return new MockIntakeLLM();
}

export async function getRewriteLLM(): Promise<RewriteLLM> {
  if (config.providers.rewriteLLM === 'live') {
    const { DeepSeekRewriteLLM } = await import('./live/llm.js');
    return new DeepSeekRewriteLLM();
  }
  return new MockRewriteLLM();
}

export async function getTTS(): Promise<TTSProvider> {
  if (config.providers.tts === 'live') {
    const { FishAudioTTS } = await import('./live/media.js');
    return new FishAudioTTS();
  }
  return new MockTTS();
}

export async function getImageProvider(): Promise<ImageProvider> {
  if (config.providers.image === 'live') {
    const { FalFluxImage } = await import('./live/media.js');
    return new FalFluxImage();
  }
  return new MockImage();
}

export async function getVideoProvider(): Promise<VideoProvider> {
  if (config.providers.video === 'live') {
    const media = await import('./live/media.js');
    return config.videoVendor === 'wan' ? new media.WanVideo() : new media.LTXVideo();
  }
  return new MockVideo();
}

export async function getStorage(): Promise<StorageProvider> {
  if (config.providers.storage === 'r2') {
    const { R2Storage } = await import('./live/r2.js');
    return new R2Storage();
  }
  return new LocalStorageProvider(config.localMediaDir);
}
