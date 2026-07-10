# 01 — CashOut flow

Status: completed

## Prerequisites already in place

- `SeatWithPlayer` is now a single exported type from `src/lib/session.ts` — no inline redeclarations needed.
- `cashOutSeat` should emit a `stack_events` row with `type='cash_out'`. The `emitStackSnapshot` helper in `session.ts` currently only emits `type='snapshot'` — a separate `emitCashOutEvent` call (or a parameter on `emitStackSnapshot`) is needed.
- The "Cash Out" button in `TheTable.svelte` currently navigates to `/session/${session.id}/cashout/${seat.id}`. Per the current design, this should instead open a Sheet inline (no separate route needed). Update `TheTable.svelte` to open a sheet directly.

Add the ability for a player to cash out and a host to cash out any player.

**`cashOutSeat({ seatId, finalStack })`** in `session.ts`:
- Updates `seats`: `cashed_out=true`, `final_stack=finalStack`, `cashed_out_at=now()`
- Writes a `stack_events` row: `type='cash_out'`, `amount=finalStack`

**UI (The Table tab):**
- Host sees a "Cash Out" button in the trailing snippet of each non-cashed-out PlayerRow
- Player sees a "Cash Out" button on their own My Session view

Both open a Sheet with:
- Title: "Cash out [name]?"
- NumberInput pre-filled with `seat.stack ?? ''`
- Confirm button — calls `cashOutSeat`, closes sheet
- Cancel button

Cashed-out rows in The Table view: move to a collapsed "Cashed Out" section, show final net, no further edit controls.
