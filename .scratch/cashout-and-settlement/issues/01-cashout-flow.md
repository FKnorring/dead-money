# 01 — CashOut flow

Status: ready-for-agent

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
