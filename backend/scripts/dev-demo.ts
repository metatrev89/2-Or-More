/**
 * End-to-end pipeline demo — zero API keys, zero accounts.
 *
 * Simulates: intake conversation -> "I am" rewriting -> stage 1 (audio+images)
 * -> stage 2 (mind movie). With ffmpeg installed it produces a REAL playable
 * portrait mp4 (color clips + tone standing in for generated media).
 *
 *   npm run demo
 */
import { getIntakeLLM, getRewriteLLM, getStorage, getTTS, getImageProvider, getVideoProvider } from '../src/adapters/index.js';
import { IntakeService } from '../src/services/intake.js';
import { AffirmationService } from '../src/services/affirmations.js';
import { MediaPipeline } from '../src/services/mediaPipeline.js';
import {
  stitchMindMovie, ffmpegAvailable, generateTestClip, generateTestAudio,
  probeDuration, sceneSecondsForAudio, concatAudio, muxClipWithAudio,
} from '../src/services/stitch.js';
import { buildPlan } from '../src/services/scheduling.js';
import { summarize } from '../src/services/gamification.js';
import { LIFE_AREAS } from '../src/types.js';
import { config } from '../src/config.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const USER = 'demo-user';

const CANNED_ANSWERS: Record<string, string[]> = {
  health_body: ['I want to lose 20 more pounds and keep my bloodwork immaculate', 'Energy and longevity for my kids'],
  emotions_creativity: ['I want my peace to be mine — steady, not reactive', 'So no one else\'s choices decide my emotions'],
  career_purpose: ['I want to make seven figures this year from my business', 'For my kids and my freedom'],
  relationships_love: ['I want to be with my children daily and at peace with their mom', 'They are why I do all of it'],
  communication_expression: ['I want to grow my audience to 100,000 people who hear my message', 'To reach people who need this'],
  mindset_growth: ['I want a mindset of continual growth I can hand down', 'So my kids start further along than I did'],
  spirit_purpose: ['Stay present in God\'s presence daily', 'It keeps me grounded and sane'],
};

async function main() {
  console.log('\n=== 2+ pipeline demo (providers:', JSON.stringify(config.providers), ') ===\n');

  // 1) Intake
  const intake = new IntakeService(await getIntakeLLM());
  const session = intake.newSession(USER);
  while (!session.completed) {
    const area = intake.currentArea(session);
    const q = await intake.nextQuestion(session);
    const answers = CANNED_ANSWERS[area] ?? ['Something meaningful', 'Because it matters'];
    const answerIdx = session.turns.filter(t => t.role === 'user').length;
    const answer = answers[Math.min(answerIdx, answers.length - 1)]!;
    console.log(`[${area}] AI: ${q}`);
    console.log(`[${area}] user: ${answer}`);
    await intake.submitAnswer(session, answer);
  }
  console.log(`\n-> intake complete: ${session.goals.length} goals across ${LIFE_AREAS.length} areas\n`);

  // 2) Rewrite to "I am"
  const affSvc = new AffirmationService(await getRewriteLLM());
  const affirmations = [...await affSvc.rewriteAll(session.goals), ...affSvc.identityStatements(USER)];
  for (const a of affirmations) console.log(`  "${a.statement}"${a.isIdentity ? ' (identity)' : ''}`);

  // 3) Stage 1: audio + images (post-paywall, trial start)
  const pipeline = new MediaPipeline(await getTTS(), await getImageProvider(), await getVideoProvider(), await getStorage());
  const stage1 = await pipeline.runStage1({
    userId: USER, affirmations, voiceSample: null, voiceConsentVerified: false, referencePhoto: null,
  });
  console.log(`\n-> stage 1: ${stage1.assets.length} assets, cost $${stage1.costUsd.toFixed(2)} (mock)`);

  // 4) Stage 2: mind movie. With ffmpeg, build a REAL stitched portrait mp4.
  const haveFfmpeg = await ffmpegAvailable();
  const outDir = join(process.cwd(), '.media', 'demo');
  await mkdir(outDir, { recursive: true });

  if (haveFfmpeg) {
    console.log('-> ffmpeg found: per-scene audio drives scene lengths...');
    const colors = ['0xE9B84C', '0x157A6E', '0x26201A', '0xFAF4E8', '0x8A7A66', '0xD97742', '0x5B4BC4'];
    const audioSeconds = [3.2, 6.8, 4.1, 9.5, 2.1, 5.5, 7.3]; // varying affirmation read lengths

    const clips: Uint8Array[] = [];
    const segments: Uint8Array[] = [];
    for (let i = 0; i < colors.length; i++) {
      const segment = await generateTestAudio(audioSeconds[i]!);
      const measured = await probeDuration(segment, 'mp3');
      const sceneLen = sceneSecondsForAudio(measured); // clamp 3-8s: audio guides, cost guards
      console.log(`   scene ${i + 1}: audio ${measured.toFixed(1)}s -> video ${sceneLen}s`);
      const clip = await generateTestClip(colors[i]!, sceneLen);
      const scene = await muxClipWithAudio(clip, segment, 'mp3');
      await writeFile(join(outDir, `scene-${i + 1}.mp4`), scene); // individual-scene feature
      clips.push(clip);
      segments.push(segment);
    }

    const fullAudio = await concatAudio(segments, 'mp3');
    const movie = await stitchMindMovie({ clips, audio: fullAudio, audioFormat: 'mp3' });
    const outPath = join(outDir, 'mind-movie-demo.mp4');
    await writeFile(outPath, movie);
    console.log(`-> STITCHED: ${outPath} (${(movie.length / 1024).toFixed(0)} KB) + 7 individual scene mp4s alongside`);
  } else {
    const stage2 = await pipeline.runStage2({ userId: USER, affirmations, images: [], sceneAudio: [], fullAudio: null });
    console.log(`-> ffmpeg not found: wrote mock manifest ${stage2.movieAsset.storageKey}`);
  }

  // 5) Scheduling + rings preview
  const plan = buildPlan({ plan: 'prime', daysSinceStart: 0 });
  console.log(`\n-> prime protocol day 0: ${plan.perDay}x/day at [${plan.slots.join(', ')}]`);
  const rings = summarize([
    { date: '2026-07-08', experiences: 9, target: 10 },
    { date: '2026-07-09', experiences: 10, target: 10 },
    { date: '2026-07-10', experiences: 4, target: 10 },
  ]);
  console.log(`-> rings: today ${rings.today.completed}/${rings.today.target}, week ${rings.weekPct}%, streak ${rings.streakDays}d, medals [${rings.medals.join(', ')}]`);

  console.log('\n=== demo complete ===\n');
}

main().catch(err => { console.error(err); process.exit(1); });
