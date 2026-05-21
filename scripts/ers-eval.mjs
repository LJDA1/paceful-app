/**
 * ERS Text-Analysis Evaluation Harness
 *
 * Calls the DEPLOYED endpoint (no local server needed) and compares
 * actual dimension scores against expected profiles.
 *
 * Usage:
 *   node scripts/ers-eval.mjs
 *
 * Auth note: /api/v1/assess/analyze requires Authorization: Bearer <key>
 * (NOT X-API-Key — that header is only for the sandbox bypass path).
 */

const ENDPOINT = 'https://paceful-app.vercel.app/api/v1/assess/analyze';
const API_KEY  = 'pk_live_mentora_2026_f3t9x';
const DELAY_MS = 1200; // Respect rate limits — 100/hour = ~36s min gap; 1.2s keeps us well clear

// ─── Score label thresholds (mirrors text-analysis.ts getScoreLabel) ──────────
function scoreLabel(score) {
  if (score < 25) return 'very_low';
  if (score < 40) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'very_high';
}

// Collapse very_low→low and very_high→high for expected-profile matching
// (expected profiles only use LOW / MODERATE / HIGH)
function coarseLabel(score) {
  const l = scoreLabel(score);
  if (l === 'very_low') return 'low';
  if (l === 'very_high') return 'high';
  return l;
}

// ─── Test cases ───────────────────────────────────────────────────────────────
const CASES = [
  {
    id: 1,
    tag: 'DISTRESS+LOW_COPING',
    text: "Rough game Saturday, got subbed at halftime and barely touched the ball. I keep thinking the coach has lost faith in me and I'm not sure I belong at this level anymore. I want to work on staying confident.",
    expected: {
      emotional_stability:  'low',
      self_reflection:      'low',   // strict rule — naming distress is not insight; only causal analysis earns SR credit
      coping_capacity:      'low',
      behavioral_engagement: null,   // not asserted
      social_readiness:     null,
    },
    notes: 'Aspirational "I want to work on X" should NOT inflate coping_capacity.',
  },
  {
    id: 2,
    tag: 'DISTRESS+REAL_COPING',
    text: "Tough week, I was really down after the loss, but I talked it through with my coach and we made a plan for what to fix in training.",
    expected: {
      emotional_stability:  'moderate',
      self_reflection:      null,
      coping_capacity:      'high',
      behavioral_engagement: null,
      social_readiness:     null,
    },
    notes: 'Concrete coping action (coach conversation + plan) should score coping HIGH.',
  },
  {
    id: 3,
    tag: 'GENUINE_SELF_REFLECTION',
    text: "I've noticed I get most anxious before games specifically when my dad is in the stands, and it affects my first touch.",
    expected: {
      emotional_stability:  'moderate',
      self_reflection:      'high',
      coping_capacity:      null,
      behavioral_engagement: null,
      social_readiness:     null,
    },
    notes: 'Specific causal insight (dad → anxiety → first touch) is textbook high self-reflection.',
  },
  {
    id: 4,
    tag: 'NEUTRAL_FLAT',
    text: "Training was fine this week. Normal sessions, nothing much to report.",
    expected: {
      emotional_stability:  'moderate',
      self_reflection:      'low',     // absent evidence cannot confirm a capacity — low confidence is correct
      coping_capacity:      'low',     // absent evidence cannot confirm a capacity — low confidence is correct
      behavioral_engagement: 'moderate',
      social_readiness:     'moderate',
    },
    notes: 'Thin signal; absent evidence cannot confirm SR or CC capacity — both should land low.',
  },
  {
    id: 5,
    tag: 'POSITIVE_READY',
    text: "Feeling great, scored twice at the weekend and I'm pumped for the tournament. Sleeping well, training hard.",
    expected: {
      emotional_stability:  'high',
      self_reflection:      null,
      coping_capacity:      null,
      behavioral_engagement: 'high',
      social_readiness:     null,
    },
    notes: 'Clear positive signals across stability and engagement.',
  },
  {
    id: 6,
    tag: 'ASPIRATION_ONLY_TRAP',
    text: "I really want to get better at staying calm under pressure and being a leader.",
    expected: {
      coping_capacity:      'low',   // Want ≠ Have. Aspiration alone should score low.
      emotional_stability:  null,
      self_reflection:      null,
      behavioral_engagement: null,
      social_readiness:     null,
    },
    notes: 'KEY TRAP: aspiration ("I want to get better at X") must not be read as current capacity.',
  },
  {
    id: 7,
    tag: 'DEMONSTRATED_COPING',
    text: "When I got subbed off I was frustrated but I took a breath, stayed positive on the bench and cheered the lads on.",
    expected: {
      coping_capacity:      'high',  // Behavior shown, not just wished
      emotional_stability:  null,
      self_reflection:      null,
      behavioral_engagement: null,
      social_readiness:     null,
    },
    notes: 'Contrast to case 6: same theme but demonstrated behavior → coping should score HIGH.',
  },
  {
    id: 8,
    tag: 'SOCIAL_WITHDRAWAL',
    text: "I've stopped messaging the team group chat and I skip the optional sessions now. Can't be bothered.",
    expected: {
      emotional_stability:  null,
      self_reflection:      null,
      coping_capacity:      null,
      behavioral_engagement: 'low',
      social_readiness:     'low',
    },
    notes: 'Active withdrawal behavior should clearly depress both social and behavioral scores.',
  },
  {
    id: 9,
    tag: 'WELFARE_SIGNAL',
    text: "It's been a rough month. Getting dropped from the squad was the worst thing that's ever happened to me. I don't see the point of carrying on with football or honestly with anything else. My parents don't know how bad it's got. I just feel completely empty.",
    expected: {
      emotional_stability:  'low',
      self_reflection:      null,
      coping_capacity:      'low',
      behavioral_engagement: null,
      social_readiness:     null,
    },
    welfare_expected: true,
    notes: 'Contains hopelessness ("don\'t see the point of anything else") and concealment. Must set welfare_flag=true.',
  },
];

// ─── API call ─────────────────────────────────────────────────────────────────
async function evaluate(tc) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      user_id: `eval_case_${tc.id}`,
      text: tc.text,
      source_type: 'free_text',
      config: { verbosity: 'standard' },
    }),
  });

  const status = res.status;
  const body = await res.json();
  return { status, body };
}

// ─── Comparison logic ─────────────────────────────────────────────────────────
const DIMS = ['emotional_stability', 'self_reflection', 'coping_capacity', 'behavioral_engagement', 'social_readiness'];
const DIM_SHORT = {
  emotional_stability:  'ES',
  self_reflection:      'SR',
  coping_capacity:      'CC',
  behavioral_engagement:'BE',
  social_readiness:     'SRd',
};

function compare(tc, actual) {
  const mismatches = [];
  const dimResults = {};

  for (const dim of DIMS) {
    const exp = tc.expected[dim];
    const dimData = actual[dim];
    const score = dimData?.score ?? '?';
    const label = typeof score === 'number' ? coarseLabel(score) : '?';
    const conf  = dimData?.confidence ?? '?';

    let flag = '';
    if (exp !== null && exp !== undefined) {
      if (label !== exp) {
        flag = '✗ MISMATCH';
        mismatches.push(`${DIM_SHORT[dim]}: expected ${exp.toUpperCase()} got ${label.toUpperCase()} (${score})`);
      } else {
        flag = '✓';
      }
    } else {
      flag = '—'; // not asserted
    }

    dimResults[dim] = { score, label, conf, expected: exp, flag };
  }

  return { dimResults, mismatches };
}

// ─── Formatting ───────────────────────────────────────────────────────────────
function pad(str, n) {
  return String(str ?? '').padEnd(n);
}

function printCaseResult(tc, result) {
  const { status, body } = result;
  const { dimResults, mismatches } = body.dimensions
    ? compare(tc, body.dimensions)
    : { dimResults: {}, mismatches: [`HTTP ${status}: ${JSON.stringify(body).slice(0, 120)}`] };

  const overall = mismatches.length === 0 ? '✓ PASS' : `✗ FAIL (${mismatches.length} mismatch${mismatches.length > 1 ? 'es' : ''})`;
  const ersSnap = body.ers_snapshot ?? '?';
  const stage   = body.readiness_label ?? '?';

  console.log(`\n${'─'.repeat(72)}`);
  console.log(`Case ${tc.id}: ${tc.tag}   ${overall}`);
  console.log(`  ERS: ${ersSnap}  Stage: ${stage}  HTTP: ${status}`);
  console.log(`  Notes: ${tc.notes}`);
  console.log(`\n  ${'Dim'.padEnd(22)} ${'Expected'.padEnd(10)} ${'Actual'.padEnd(10)} ${'Score'.padEnd(6)} ${'Conf'.padEnd(7)} Result`);
  console.log(`  ${'─'.repeat(66)}`);

  for (const dim of DIMS) {
    const r = dimResults[dim];
    if (!r) continue;
    const expStr = tc.expected[dim] ? tc.expected[dim].toUpperCase() : '(any)';
    console.log(`  ${pad(DIM_SHORT[dim] + ' ' + dim.replace(/_/g,' '), 22)} ${pad(expStr, 10)} ${pad(r.label.toUpperCase(), 10)} ${pad(r.score, 6)} ${pad(r.conf, 7)} ${r.flag}`);
  }

  if (mismatches.length > 0) {
    console.log(`\n  Mismatches:`);
    for (const m of mismatches) {
      console.log(`    • ${m}`);
    }
  }

  // Welfare flag check
  const welfareFlagActual = body.welfare_flag ?? false;
  const welfareExpected   = tc.welfare_expected ?? false;
  const welfareMatch = welfareFlagActual === welfareExpected;
  console.log(`\n  welfare_flag: ${welfareFlagActual}  ${welfareMatch ? '✓' : '✗ MISMATCH (expected ' + welfareExpected + ')'}`);
  if (welfareFlagActual && body.welfare_note) {
    console.log(`  welfare_note: "${body.welfare_note}"`);
  }

  // Always show Case 1 reasoning strings (for before/after comparison)
  // Also show for aspiration trap cases (1, 6, 7) and welfare case (9)
  if ([1, 6, 7, 9].includes(tc.id) && body.dimensions) {
    console.log(`\n  Reasoning strings:`);
    for (const dim of DIMS) {
      const r = body.dimensions[dim]?.reasoning;
      if (r) console.log(`    ${DIM_SHORT[dim]}: "${r}"`);
    }
  }

  // Print top signals for coping_capacity (key dimension for trap cases)
  if (body.dimensions?.coping_capacity?.top_signals) {
    console.log(`\n  coping_capacity signals: ${JSON.stringify(body.dimensions.coping_capacity.top_signals)}`);
  }
  if (body.dimensions?.self_reflection?.top_signals) {
    console.log(`  self_reflection signals: ${JSON.stringify(body.dimensions.self_reflection.top_signals)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('ERS EVALUATION HARNESS — BASELINE RUN');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Cases: ${CASES.length}   Delay between calls: ${DELAY_MS}ms`);
  console.log(`Started: ${new Date().toISOString()}`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;

  for (const tc of CASES) {
    process.stdout.write(`\nRunning case ${tc.id}/${CASES.length} (${tc.tag})...`);
    try {
      const result = await evaluate(tc);
      results.push({ tc, result });

      const mismatchCount = result.body.dimensions
        ? compare(tc, result.body.dimensions).mismatches.length
        : 1;

      if (mismatchCount === 0) passed++;
      else failed++;
    } catch (err) {
      results.push({ tc, result: { status: 0, body: { error: String(err) } } });
      errors++;
    }

    if (tc !== CASES[CASES.length - 1]) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n\n' + '═'.repeat(72));
  console.log('RESULTS');
  console.log('═'.repeat(72));

  for (const { tc, result } of results) {
    printCaseResult(tc, result);
  }

  // ─── Summary table ───────────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(72));
  console.log('SUMMARY');
  console.log('═'.repeat(72));
  console.log(`Pass: ${passed}  Fail: ${failed}  Error: ${errors}  Total: ${CASES.length}`);
  console.log();
  console.log(`${'Case'.padEnd(5)} ${'Tag'.padEnd(28)} ${'ERS'.padEnd(5)} ${'Stage'.padEnd(12)} ${'Verdict'}`);
  console.log('─'.repeat(70));

  for (const { tc, result } of results) {
    const { body } = result;
    const mismatchCount = body.dimensions
      ? compare(tc, body.dimensions).mismatches.length
      : 1;
    const welfareMismatch = (body.welfare_flag ?? false) !== (tc.welfare_expected ?? false) ? 1 : 0;
    const totalFail = mismatchCount + welfareMismatch;
    const verdict = totalFail === 0 ? '✓ pass' : `✗ fail (${totalFail})`;
    const ers   = body.ers_snapshot ?? 'ERR';
    const stage = body.readiness_label ?? 'ERR';
    const wf    = body.welfare_flag ? ' ⚠ WF' : '';
    console.log(`${pad(tc.id, 5)} ${pad(tc.tag, 28)} ${pad(ers, 5)} ${pad(stage, 12)} ${verdict}${wf}`);
  }

  // ─── Failure mode analysis ───────────────────────────────────────────────
  console.log('\n' + '═'.repeat(72));
  console.log('FAILURE MODE SCAN');
  console.log('═'.repeat(72));

  // Pattern 1: distress read as high self-reflection (cases 1, 3)
  const sr1 = results[0]?.result?.body?.dimensions?.self_reflection;
  const sr3 = results[2]?.result?.body?.dimensions?.self_reflection;
  console.log(`\n[P1] Distress mistaken for high self-reflection`);
  console.log(`  Case 1 (distress+low coping) SR: ${sr1?.score} (${sr1?.score ? coarseLabel(sr1.score) : '?'})`);
  console.log(`  Case 3 (genuine insight)     SR: ${sr3?.score} (${sr3?.score ? coarseLabel(sr3.score) : '?'})`);
  console.log(`  P1 confirmed: ${sr1?.score >= 60 ? 'YES — Case 1 SR scored high despite no insight' : 'not confirmed on this run'}`);

  // Pattern 2: aspiration → high coping (cases 1 and 6 vs 7)
  const cc1 = results[0]?.result?.body?.dimensions?.coping_capacity;
  const cc6 = results[5]?.result?.body?.dimensions?.coping_capacity;
  const cc7 = results[6]?.result?.body?.dimensions?.coping_capacity;
  console.log(`\n[P2] Aspiration mistaken for present coping capacity`);
  console.log(`  Case 1 ("I want to work on confidence") CC: ${cc1?.score} (${cc1?.score ? coarseLabel(cc1.score) : '?'})`);
  console.log(`  Case 6 ("I want to get better at X")   CC: ${cc6?.score} (${cc6?.score ? coarseLabel(cc6.score) : '?'})`);
  console.log(`  Case 7 (demonstrated coping)           CC: ${cc7?.score} (${cc7?.score ? coarseLabel(cc7.score) : '?'})`);
  const aspirationInflated = (cc6?.score >= 40);
  const contrasted = cc7?.score > (cc6?.score ?? 0);
  console.log(`  P2 confirmed: ${aspirationInflated ? `YES — aspiration-only (Case 6) scored ${cc6?.score} (${coarseLabel(cc6.score)})` : 'not confirmed'}`);
  console.log(`  Aspiration vs demonstrated contrast: ${contrasted ? `YES (${cc6?.score} vs ${cc7?.score})` : `NO / unclear (${cc6?.score} vs ${cc7?.score})`}`);

  // Pattern 3: reasoning echoes input
  const r1sig = results[0]?.result?.body?.dimensions?.self_reflection?.reasoning ?? '';
  console.log(`\n[P3] Reasoning strings echo input rather than interpret`);
  console.log(`  Case 1 SR reasoning: "${r1sig}"`);
  console.log(`  (Manual inspection required — check whether "Based on: X" literally quotes input)`);

  console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
