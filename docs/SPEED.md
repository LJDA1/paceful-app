# /api/v1/assess/analyze — Latency Notes

## Current state (profiled 2026-05-22)

Total: ~10.7s
Breakdown: ~9.3s Claude completion + ~1.4s DB overhead

| Step | Time |
|---|---|
| auth (validatePartnerKey) | ~440ms |
| rate-limit + config (parallel) | ~395ms |
| Claude call | ~9,400ms |
| usage log (non-blocking) | 0ms on response path |
| **Total** | **~10,700ms** |

## Part 1 DB optimisations — shipped 2026-05-22

Three changes that saved ~1.2s from the non-Claude path:

1. **Removed dead `text_assessments` insert** — table does not exist in Supabase; insert was
   silently failing and eating ~425ms per request. Persistence disabled until table is created.
2. **`logPartnerApiUsage` made non-blocking** — fire-and-forget with `.catch(() => {})`.
   Removed ~116ms from the partner's response path.
3. **`checkEndpointRateLimit` + `loadPartnerConfig` parallelised** — both depend on `partnerId`
   but not on each other. Replaced sequential awaits with `Promise.all`. Saves ~75ms.

## Model

`claude-sonnet-4-20250514`, max_tokens 1200, single call per request, no retries.

Override without code change: set `ERS_MODEL` env var (e.g. `ERS_MODEL=claude-haiku-4-5-20251001`).
Default is always sonnet — the env var is not set in production.

## Future work: Haiku swap (do not build until triggered)

- **Trigger:** a signed partner with a concrete latency SLA.
- **What to validate before flipping ERS_MODEL in prod:**
  - Run full regression suite (`npm run test:regression`) against Haiku.
  - Confirm the coping gradient holds numerically: distress+aspiration ~20, demonstrated
    action ~70+. Passing thresholds is not enough — the actual scores must separate cleanly.
  - Confirm `claude-haiku-4-5-20251001` is available at the account tier (529 overloaded
    errors were persistent on 2026-05-21; may be a capacity issue at current tier).
- **Expected gain if Haiku holds:** Claude call ~2–3s vs ~9.4s = ~7s faster end-to-end.

## Future work: real-time (<2s) scoring

The LLM call floor is multi-second. Tuning will not close the gap.

Pattern to implement when needed:
1. POST /assess/analyze returns `202 Accepted` with `job_id` immediately.
2. Score runs async in background worker / edge function.
3. Partner polls `GET /assess/analyze/{job_id}` or receives result via webhook
   (`ers.completed` event on their registered webhook URL).

Current ~10.7s is acceptable for async and demo use cases.

## text_assessments persistence

The `text_assessments` table does not exist in Supabase. When you want to re-enable
assessment storage, create the table then restore the insert in
`src/app/api/v1/assess/analyze/route.ts` (see git history for the removed block).
