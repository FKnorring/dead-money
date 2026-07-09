# PRD: Cash Out & Settlement

Status: ready-for-agent

## Problem Statement

When a player leaves mid-game or the session ends, the app needs to lock in their final stack, calculate who owes who, and make settling up as painless as possible — ideally one tap of a Swish link per transfer.

## Solution

A two-part flow:

1. **CashOut** — a player (or the host) locks their final stack. Their row freezes; they disappear from active tracking.
2. **Session End + Settlement** — host ends the session. All players are prompted to submit final stacks. Host fills in any missing ones. Settlement screen shows net results + minimized transfer list + Swish deep links.

## User Stories

1. As a player, I want to cash out by entering my final stack, so my result is locked and I can leave.
2. As a host, I want to initiate a cash-out for any player, so I can lock their result if they leave without doing it themselves.
3. As a player, I want to see a confirmation before cashing out, so I don't accidentally lock myself out.
4. As a host, I want to end the session when the game is over, so settlement can be calculated.
5. As a host, I want all players to be prompted for their final stack when I end the session, so the numbers are accurate.
6. As a host, I want to fill in missing final stacks for players who didn't respond, so settlement can proceed.
7. As a player, I want to see my net result (won/lost) clearly after the session ends, so I know my outcome immediately.
8. As a player, I want to see a list of who owes who with the fewest possible transfers, so settling up is simple.
9. As a player who is owed money, I want a Swish deep link for each incoming transfer, so the payer can pay me in one tap.
10. As a player, I want the Swish link to pre-fill the amount and a message ("Poker [date]"), so there's no manual entry.
11. As a player, I want to add my Swish number to my player profile, so Swish links work for me.
12. As a player, I want to see the biggest winner and loser highlighted on the session end screen, so the drama lands.
13. As a player, I want the session end screen to feel ceremonial — expressive animation, display font, suits — so it's a satisfying moment.
14. As a host, I want cashed-out players' rows to be visually locked in The Table view, so it's clear they're done.

## Implementation Decisions

- **CashOut flow:**
  - Triggered via a "Cash Out" button on The Table view (host) or a "Cash Out" button on My Session (player).
  - Opens a Sheet with a `NumberInput` pre-filled with `seat.stack` (or blank if null). Player confirms their final stack.
  - On confirm: updates `seats` — sets `cashed_out=true`, `final_stack=<value>`, `cashed_out_at=now()`. Writes a `stack_events` row (type: `cash_out`, amount = final_stack).
  - New lib helper: `cashOutSeat({ seatId, finalStack })` in `session.ts`.

- **Session end flow:**
  - Host taps "End Session" button (visible in The Table view or a session menu).
  - The session state transitions: a new `lobby` → `active` → **`closed`** state. New lib helper: `closeSession(sessionId)` — updates `sessions` set `state='closed'`, `closed_at=now()`.
  - Before closing, the app checks for any seats with `cashed_out=false`. If any exist, a realtime prompt appears on those players' screens (via Realtime session subscription) asking them to enter their final stack.
  - Host can manually fill in remaining stacks from a "Finalize" screen.

- **Settlement screen (`/session/[id]/end`):**
  - Loaded after session is closed.
  - Computes `net` per seat using existing `calculateNet(totalBuyIns, finalStack ?? 0)`.
  - Runs existing `calculateSettlement(SeatResult[])` → `Transfer[]`.
  - Swish link format: `swish://payment?payee=<swish_number>&amount=<amount>&message=Poker+<date>`. Only shown if the payee's `players.swish_number` is set.
  - Fallback for missing Swish: "Copy to clipboard" button with the amount.
  - **Design:** ceremonial screen — `.felt` texture, `font-display` for hero numbers, suits as dividers, expressive entrance animation (net results slam in one by one).

- **Swish number:** players can add/edit their Swish number on the session end screen ("Add your Swish number to receive payments"). Updates `players.swish_number`. New lib helper: `updatePlayerSwish(playerId, swishNumber)`.

- **Transfer type** in `settlement.ts` currently has no `swishLink` field. Extend it:
  ```ts
  interface Transfer {
    from: string;     // playerId
    to: string;       // playerId
    amount: number;   // kr
    swishLink?: string; // only if payee has swish_number
  }
  ```
  The settlement screen computes Swish links by joining Transfer with Player registry data.

## Testing Decisions

- **`calculateSettlement`** is already tested in `settlement.test.ts` — 5 tests covering two-player, split debtor, minimization, break-even, all-break-even. These remain the primary tests.
- **`calculateNet`** is already tested in `net.test.ts` — 4 tests. These remain valid.
- **CashOut mutation** (`cashOutSeat`) follows the same pattern as `claimSeat` — a single DB update. Test manually via the UI.
- **Swish link construction** is a pure string function — add a unit test: `buildSwishLink({ swishNumber, amount, date }) → string`.

## Out of Scope

- Partial cash-outs (player leaves with some chips still in play)
- Dispute resolution
- Automatic Swish API integration (deep link only)

## Further Notes

- The `calculateSettlement` algorithm already handles all the math — the settlement screen is primarily a display problem.
- The `Transfer` type extension (adding `swishLink`) is backwards-compatible — the existing tests don't check for the absence of the field.
- If no Swish numbers are registered, the settlement screen still works — it just shows amounts without tap-to-pay links.
