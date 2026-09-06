function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const config = {
  providers: {
    intakeLLM: env('PROVIDER_INTAKE_LLM', 'mock'),
    rewriteLLM: env('PROVIDER_REWRITE_LLM', 'mock'),
    tts: env('PROVIDER_TTS', 'mock'),
    image: env('PROVIDER_IMAGE', 'mock'),
    video: env('PROVIDER_VIDEO', 'mock'),
    storage: env('PROVIDER_STORAGE', 'local'),
  },
  videoVendor: env('VIDEO_VENDOR', 'ltx') as 'ltx' | 'wan',

  // Secrets are read lazily (getters): on Workers, process.env is populated
  // from bindings and module-init timing must never bake in a stale/empty
  // value. Trim guards against paste artifacts (trailing newline/space).
  get metaApiKey() { return env('META_MODEL_API_KEY').trim(); },
  metaApiBase: env('META_MODEL_API_BASE', 'https://api.meta.ai/v1'),
  get anthropicApiKey() { return env('ANTHROPIC_API_KEY').trim(); },
  get togetherApiKey() { return env('TOGETHER_API_KEY').trim(); },
  get fishApiKey() { return env('FISH_AUDIO_API_KEY').trim(); },
  get falApiKey() { return env('FAL_API_KEY').trim(); },
  get ltxApiKey() { return env('LTX_API_KEY').trim(); },

  supabaseUrl: env('SUPABASE_URL'),
  supabaseAnonKey: env('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),

  r2: {
    accountId: env('R2_ACCOUNT_ID'),
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    bucket: env('R2_BUCKET', 'twoplus-media'),
  },

  revenuecatWebhookSecret: env('REVENUECAT_WEBHOOK_SECRET'),
  localMediaDir: env('LOCAL_MEDIA_DIR', './.media'),
  port: Number(env('PORT', '8787')),
};
