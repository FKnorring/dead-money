# PRD: Active Session — Live Tracking Screen

Status: ready-for-agent

## Problem Statement

Once a game starts, players need to track their buy-ins and current stack in real time from their phones. Right now the play screen is a stub. Every player should be able to update their own stack and record top-ups with minimal friction — ideally one or two taps — without breaking concentration at the table. The host also needs to see everyone's data and be able to edit any seat.

## Solution

Two tab-based views accessible during an active session:

- **My Session** (default tab) — personal tracking focused. Big delta buttons for stack adjustments, quick-select chip buttons for buy-ins/top-ups, a running net indicator.
- **The Table** (second tab) — scoreboard for everyone at the table. Live P&L for all seats, sortable by net. No editing from this view.

Both views auto-update via Supabase Realtime as any player makes changes.

## User Stories

1. As a player, I want to see my current stack and total buy-ins when the game goes Active, so I know my starting position.
2. As a player, I want to tap a quick-select chip button (+100 kr, +200 kr etc.) to record a buy-in / top-up, so I can stay at the table without hunting for a keyboard.
3. As a player, I want the quick-select amounts to be based on the session's buy-in amount (0.5x, 1x, 1.5x, 2x multiples), so the buttons are calibrated to our stakes.
4. As a player, I want an "Other amount" option on the buy-in sheet, so I can enter edge-case amounts.
5. As a player, I want to adjust my current stack up or down using delta buttons (–100, –50, +50, +100 etc.), so I can keep my stack roughly accurate without counting chips constantly.
6. As a player, I want to enter an exact absolute stack value, so I can correct my stack precisely when needed.
7. As a player, I want to see my running net (stack minus total buy-ins) at a glance, so I know how I'm doing.
8. As a player, I want to toggle between kr and BB display anywhere in the app with one tap, so I can think in the unit that makes sense to me.
9. As a player, I want my stack and buy-in changes to be timestamped and stored as StackEvents, so the session timeline is accurate.
10. As a player, I want to see all other players' names, stacks, buy-ins, and live net on The Table view, so I can see who's up and who's down.
11. As a player, I want The Table view to update in real time as other players make changes, so I never need to refresh.
12. As a player, I want my own row to be visually highlighted on The Table view, so I can find myself instantly.
13. As a player, I want to switch between My Session and The Table with a bottom tab bar, so navigation is obvious and fast.
14. As a host, I want to be able to edit any player's stack or record a buy-in on their behalf, so I can help players who aren't updating their own.
15. As a host, I want to see a "cash out" button on each player's row, so I can initiate cashout for players who are leaving.
16. As a player, I want the delta buttons to default to sensible amounts based on the session's BB size, so they feel calibrated to this game.
17. As a player, I want all money values to use tabular-nums formatting, so numbers don't jump width when they update.
18. As a player, I want stack value changes to animate with a brief count-up/down roll (200 ms), so I can see at a glance which number changed.

## Implementation Decisions

- **Route:** `/session/[id]/play` replaces the current stub. Loads session + all seats with player names + all buy_ins for the session.
- **Two-tab layout:** "My Session" and "The Table" rendered as a fixed bottom tab bar. Tabs switch the content area without navigation.
- **My Session view:**
  - Shows player's name, current stack (large), total buy-ins, and running net (color-coded via `.net-positive`/`.net-negative`/`.net-zero`).
  - **Buy-in section:** ChipButton row for 0.5×, 1×, 1.5×, 2× multiples of `session.buy_in_amount`. Tapping one: inserts a `buy_ins` row AND upserts `sessions.seats.stack` if this is the first buy-in and stack is null (seed it to the buy-in amount). Also writes a `stack_events` row of type `snapshot`.
  - **Stack section:** Delta ChipButtons for –100/–50/+50/+100/+200 (amounts based on `session.bb_size`; primary row: 0.5×, 1×, 1.5×, 2× BB). Tapping one: updates `seats.stack` and writes a `stack_events` row of type `snapshot`.
  - **Custom amount:** a Sheet (using the existing `Sheet` component) with `NumberInput` for free-form buy-in or stack entry.
  - **kr/BB toggle:** stored in `localStorage` as `display_unit` = `'kr'|'bb'`. A global Svelte store (or `$state` in the layout) passes the unit down; all money displays convert via `krToBb`/`bbToKr` from `chips.ts`. The session's `buy_in_amount` is the conversion anchor.
- **The Table view:**
  - List of all seats using `PlayerRow` component.
  - `isYou` set on the current player's row.
  - Net computed via `calculateNet` (from `net.ts`) using seat's `stack` and sum of `buy_ins`.
  - Sorted by net descending (winners at top).
  - No edit actions from this view; tap a row does nothing.
- **Realtime:** Subscribe to `postgres_changes` on `seats` AND `buy_ins` for this session. On any change, re-fetch the affected seat's buy_ins sum + stack to recompute net inline. Use the same cleanup pattern already in the lobby (`supabase.removeChannel`).
- **New lib helpers needed in `session.ts`:**
  - `recordBuyIn({ seatId, sessionId, playerId, amount })` — inserts `buy_ins` row + writes `stack_events` snapshot
  - `updateStack({ seatId, amount, sessionId, playerId, type })` — updates `seats.stack`, writes `stack_events` snapshot
  - `loadBuyInTotals(sessionId)` — returns `{ [playerId]: number }` map of summed buy_ins per player
- **StackEvent writing:** every stack change (buy-in seed, delta, absolute) writes one `stack_events` row.
- **Host edit:** host sees edit icons on each PlayerRow trailing snippet; tapping opens the same buy-in/stack sheet but pre-scoped to that seat.

## Testing Decisions

Good tests verify observable behavior through public interfaces — not implementation details like internal function calls or database state directly.

- **`recordBuyIn` and `updateStack`** in `session.ts` are the seams to test if the project adds integration tests against a test DB. For now, unit tests on `calculateNet` (already exists) and `krToBb`/`bbToKr` (already exists) cover the derived logic.
- **The kr/BB toggle** is a pure conversion: `krToBb(200, { buyInKr: 200 }) === 100` is already tested in `chips.test.ts`. No new tests needed for the UI toggle itself.
- **`loadBuyInTotals`** is a simple Supabase query — not worth mocking. Test via integration or manual verification.

## Out of Scope

- CashOut flow (covered in cashout-and-settlement PRD)
- Session end / settlement screen
- Awards
- Leaderboard

## Further Notes

- `ChipButton` and `PlayerRow` components are already built and tested — they're ready to use.
- The 200ms count-up animation on stack changes should use CSS `@keyframes` or a simple Svelte transition, not a JS timer — keep it light for mobile performance.
- The kr/BB toggle is a per-device preference (localStorage), not stored in the DB. Each player can independently prefer their unit.
- If a player's stack is null (they haven't updated it yet), show "—" in The Table view (already handled by `PlayerRow`).
