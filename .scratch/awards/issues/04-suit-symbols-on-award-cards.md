# 04 — Suit symbols on award cards with animated entrance

Status: completed

## What to build

Two requirements from `docs/DESIGN.md` are currently unmet on the awards section:

1. **Suit symbols as bullet points on each card.** The design doc places `♠ ♥ ♦ ♣` as *"award screen bullet points"* — i.e. decorative elements on individual cards, not only as a section divider. Currently suits appear only in the horizontal divider between the transfers and awards sections.

2. **Suits animate.** The Motion/Ceremonial section says *"suits animate, names land with impact."* Currently `award-reveal` animates the entire card container as one unit; the suit symbol has no independent entrance.

Rework the award card template and CSS so each card has a suit symbol that enters with its own brief animation, distinct from (and ideally slightly offset from) the card body entrance.

## Acceptance criteria

- [ ] Each award card displays a suit symbol (♠, ♥, ♦, or ♣) as a decorative element — not just in the section divider
- [ ] The suit symbol has its own CSS animation — it does not simply fade in with the rest of the card as a single unit
- [ ] The existing section divider between transfers and awards is retained (or replaced if the per-card suits make it redundant — implementer's call)
- [ ] The overall card entrance still feels theatrical and staggered per the existing `award-reveal` keyframe

## Blocked by

02 — Award card cleanup (timing and structure should be stable before layering motion on top).
