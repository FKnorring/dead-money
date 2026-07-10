# 03 — Award icon field

Status: ready-for-agent

## What to build

The PRD specifies (in the Solution, User Story 1, and Further Notes) that each award has an icon. Add an `icon` field to the `Award` type, populate it per award in the copy table, render it on each award card, and cover it in tests.

The icon can be an emoji or a single character — each award should have one that fits its tone (e.g. 🐋 for The Whale, 💸 for The Philanthropist, 🤷 for The Philosopher). The choice is up to the implementer; it just needs to be present, distinct, and rendered visibly on the card.

## Acceptance criteria

- [ ] `Award` interface has an `icon: string` field
- [ ] Every award category in the copy table has an icon defined
- [ ] The icon is rendered on each award card in the settlement screen
- [ ] The test that checks non-empty fields includes `icon`

## Blocked by

None — can start immediately.
