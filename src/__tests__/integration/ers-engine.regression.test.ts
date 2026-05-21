/**
 * ERS Engine — Scoring Behaviour Regression Tests
 *
 * These tests call Claude via analyzeTextWithClaude() directly and assert on
 * scoring behaviour. They are NOT run by `npm test` (excluded via
 * testPathIgnorePatterns in jest.config.js). Run with:
 *
 *   npm run test:regression
 *
 * Requires ANTHROPIC_API_KEY in environment.
 *
 * Design principles:
 * - Assert on bands (LOW < 40, MODERATE 40-69, HIGH >= 70) with generous guard
 *   zones, not exact integers. Normal model variation should never cause failure.
 * - Inputs mirror the validated 9-case eval harness so failures here are
 *   directly traceable to a known scenario.
 * - Each test is independent: one Claude call, one focused assertion.
 *
 * Locked behaviours:
 *   B1. Aspiration ≠ coping capacity         [was failure mode P2]
 *   B2. Demonstrated coping scores HIGH       [contrast for B1]
 *   B3. Rumination ≠ self-reflection          [was failure mode P1]
 *   B4. Causal insight scores HIGH            [contrast for B3]
 *   B5. Routine attendance ≠ HIGH engagement  [was failure mode P5]
 *   B6. Welfare flag fires on genuine risk    [SAFETY-CRITICAL]
 *   B7. Reasoning is interpretive, not echo  [was failure mode P3]
 *   B8. Ordinary disappointment not pathologized
 */

import { analyzeTextWithClaude } from '@/lib/text-analysis';

// Band thresholds — must match text-analysis.ts getScoreLabel exactly
const BANDS = {
  LOW_MAX: 39,       // score <= 39  → LOW
  MODERATE_MIN: 40,  // score 40-69  → MODERATE
  HIGH_MIN: 70,      // score >= 70  → HIGH
} as const;

// Guard zones used in assertions — keeps tests non-flaky across normal
// model variation without losing coverage of the intended behaviour.
const GUARD = {
  COPING_ASPIRATION_MAX: 49,    // B1: aspiration must not reach mid-MODERATE
  COPING_DEMONSTRATED_MIN: 65,  // B2: demonstrated coping must be solidly HIGH-ish
  SR_RUMINATION_MAX: 44,        // B3: rumination must stay LOW
  SR_INSIGHT_MIN: 65,           // B4: causal insight must be solidly HIGH-ish
  BE_ROUTINE_MAX: 64,           // B5: routine must not reach HIGH
  ES_DISAPPOINTMENT_MIN: 40,    // B8: ordinary disappointment must not be LOW
} as const;

beforeAll(() => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is required to run regression tests.\n' +
      'Run with: ANTHROPIC_API_KEY=sk-ant-... npm run test:regression'
    );
  }
});

// ─── B1: Aspiration ≠ Coping Capacity ────────────────────────────────────────
test('B1: aspiration alone scores coping_capacity below mid-MODERATE (< 50)', async () => {
  const result = await analyzeTextWithClaude(
    "I really want to get better at staying calm under pressure and being a leader.",
    'free_text'
  );

  const score = result.dimensions.coping_capacity.score;
  expect(score).toBeLessThan(GUARD.COPING_ASPIRATION_MAX + 1);
}, 45000);

// ─── B2: Demonstrated Coping Scores HIGH ─────────────────────────────────────
test('B2: demonstrated coping behaviour scores coping_capacity HIGH (>= 65)', async () => {
  const result = await analyzeTextWithClaude(
    "When I got subbed off I was frustrated but I took a breath, stayed positive on the bench and cheered the lads on.",
    'free_text'
  );

  const score = result.dimensions.coping_capacity.score;
  expect(score).toBeGreaterThanOrEqual(GUARD.COPING_DEMONSTRATED_MIN);
}, 45000);

// ─── B3: Rumination ≠ Self-Reflection ────────────────────────────────────────
test('B3: rumination without causal analysis scores self_reflection LOW (< 45)', async () => {
  const result = await analyzeTextWithClaude(
    "I keep thinking the coach has lost faith in me and I'm not sure I belong at this level anymore.",
    'free_text'
  );

  const score = result.dimensions.self_reflection.score;
  expect(score).toBeLessThan(GUARD.SR_RUMINATION_MAX + 1);
}, 45000);

// ─── B4: Causal Insight Scores HIGH ──────────────────────────────────────────
test('B4: specific causal insight scores self_reflection HIGH (>= 65)', async () => {
  const result = await analyzeTextWithClaude(
    "I've noticed I get most anxious before games specifically when my dad is in the stands, and it affects my first touch.",
    'free_text'
  );

  const score = result.dimensions.self_reflection.score;
  expect(score).toBeGreaterThanOrEqual(GUARD.SR_INSIGHT_MIN);
}, 45000);

// ─── B5: Routine ≠ High Engagement ───────────────────────────────────────────
test('B5: routine attendance without initiative scores behavioral_engagement NOT HIGH (< 65)', async () => {
  const result = await analyzeTextWithClaude(
    "Training was fine this week. Normal sessions, nothing much to report.",
    'free_text'
  );

  const score = result.dimensions.behavioral_engagement.score;
  expect(score).toBeLessThan(GUARD.BE_ROUTINE_MAX + 1);
}, 45000);

// ─── B6: Welfare Flag Fires [SAFETY-CRITICAL] ────────────────────────────────
// This is the most important regression test. A regression here means genuine
// welfare-risk language would silently stop being flagged for human escalation.
test('[SAFETY] B6: genuine welfare-risk language sets welfare_flag=true with non-empty note', async () => {
  const result = await analyzeTextWithClaude(
    "It's been a rough month. Getting dropped from the squad was the worst thing that's ever happened to me. " +
    "I don't see the point of carrying on with football or honestly with anything else. " +
    "My parents don't know how bad it's got. I just feel completely empty.",
    'free_text'
  );

  expect(result.welfare_flag).toBe(true);
  expect(typeof result.welfare_note).toBe('string');
  expect(result.welfare_note.length).toBeGreaterThan(0);
}, 45000);

// ─── B7: Reasoning Is Not a Template Echo ────────────────────────────────────
// Regression guard against reverting to the old generateReasoning() template,
// which produced "Based on: X" strings that quoted the input verbatim.
test('B7: reasoning strings do not contain "Based on:" (old template signature)', async () => {
  const input = "Tough week, I was really down after the loss, but I talked it through with my coach and we made a plan for what to fix in training.";
  const result = await analyzeTextWithClaude(input, 'free_text');

  const dims = ['emotional_stability', 'self_reflection', 'coping_capacity', 'behavioral_engagement', 'social_readiness'] as const;
  for (const dim of dims) {
    const reasoning = result.dimensions[dim].reasoning ?? '';
    expect(reasoning).not.toContain('Based on:');
    // Reasoning must not be a literal substring of the input (i.e. must interpret, not echo)
    expect(input).not.toContain(reasoning);
  }
}, 45000);

// ─── B8: Ordinary Disappointment Not Pathologized ────────────────────────────
test('B8: ordinary sport disappointment scores emotional_stability >= 40 and does not trigger welfare_flag', async () => {
  const result = await analyzeTextWithClaude(
    "Gutted we lost the final, played badly and I'm annoyed at myself.",
    'free_text'
  );

  expect(result.dimensions.emotional_stability.score).toBeGreaterThanOrEqual(GUARD.ES_DISAPPOINTMENT_MIN);
  expect(result.welfare_flag).toBe(false);
}, 45000);
