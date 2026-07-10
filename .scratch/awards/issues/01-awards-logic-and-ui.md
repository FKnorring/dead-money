# 01 — Awards logic + settlement screen integration

Status: completed

Build `src/lib/awards.ts` with `calculateAwards(seats: AwardInput[]): Award[]` and integrate it into the settlement screen.

**Logic:** pure function, no DB calls. See PRD for award categories, inputs, and mock descriptions.

**Tests:** `src/lib/awards.test.ts` — test with 3 known players, assert correct recipients and award IDs. Use literal expected values (not recomputed from the same logic).

**Settlement screen integration:**
- After the transfer list, render awards section
- Each award: animates in with a staggered entrance (100ms delay per card)
- Card layout: large award title (display font), recipient name, stat, mocking description
- Suit symbols (♠♥♦♣) as decorative bullets between awards
