# 02 — Award card cleanup

Status: completed

## What to build

Fix a handful of small correctness and code-quality issues surfaced by code review — no new visible behaviour, but the awards section will match the spec exactly and the logic will be cleaner.

## Acceptance criteria

- [ ] Animation stagger delay is 100 ms per card (was 120 ms)
- [ ] `AwardInput` no longer has a `totalBuyIns` field — it was declared but never read inside `calculateAwards`; remove it from the interface, the component mapping, and the tests
- [ ] The comeback swing calculation (`(finalStack ?? 0) - (stackLow ?? buyInAmount)`) is not duplicated — computed once and threaded through to the stat formatter rather than recomputed inside the callback
- [ ] A small `formatSigned(n)` helper (or equivalent) is extracted so the `sign = n >= 0 ? '+' : ''` pattern is not repeated across multiple award callbacks

## Blocked by

None — can start immediately.
