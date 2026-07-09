# 02 — Session lib helpers for active tracking

Status: ready-for-agent

Add to `src/lib/session.ts`:

**`recordBuyIn({ seatId, sessionId, playerId, amount })`**
- Inserts a `buy_ins` row
- Writes a `stack_events` row (type: `snapshot`, amount = buy-in amount) for timeline
- If the seat's current `stack` is null, also sets `seats.stack = amount` (seeds the stack to the first buy-in)

**`updateStack({ seatId, sessionId, playerId, stack })`**
- Updates `seats.stack` to the new absolute value
- Writes a `stack_events` row (type: `snapshot`, amount = new stack value)

**`loadBuyInTotals(sessionId)`**
- Queries `buy_ins` grouped by `player_id`, returns `Record<string, number>` (playerId → total kr)

Export all three from `src/lib/index.ts`.

These helpers follow the same pattern as the existing helpers in `session.ts` (typed against `database.types.ts`, use the `supabase` client from `$lib`). No mock required — test manually via the play screen.
