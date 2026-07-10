# 02 — Session close + settlement screen

Status: completed

## Prerequisites already in place

- `calculateSettlement` in `src/lib/settlement.ts` is fully implemented and tested — it is the authoritative settlement algorithm.
- `calculateNet` in `src/lib/net.ts` is the authoritative net formula — use it for every per-seat net calculation on the settlement screen.
- `useSessionSync` (`src/lib/sessionSync.ts`) should be used by the `/session/[id]/end` route to keep the seat list live. The route only needs to subscribe; it never needs to handle a redirect (the session is already closed).
- `formatAmount` and `netClass`/`netSign` from `src/lib/chips.ts` are the canonical display helpers — use them on the settlement screen.
- The lobby page session-state Realtime handler currently redirects to `/session/${id}/play` on `active` and does nothing on `closed`. Add a redirect to `/session/${id}/end` when `state === 'closed'`.
- The play page session-state Realtime handler currently redirects to `/session/${id}` (lobby) when state is not `active`. Change this to redirect to `/session/${id}/end` when `state === 'closed'` (and keep the lobby fallback for any other unexpected state).

**`closeSession(sessionId)`** in `session.ts`:
- Updates `sessions`: `state='closed'`, `closed_at=now()`

**End Session button** (host only, visible in The Table view):
- Checks for seats with `cashed_out=false`
- If any: show confirmation sheet listing uncashed players, option to fill in their stacks or proceed anyway (treats null stack as 0 for settlement)
- On confirm: calls `closeSession`. Realtime session subscription redirects all clients to `/session/[id]/end`.

**Settlement screen (`/session/[id]/end`):**
- Loads session, all seats, player names, and buy-in totals
- Computes net per seat: `calculateNet({ totalBuyIns, finalStack: seat.final_stack })`
- Runs `calculateSettlement(seats.map(s => ({ playerId: s.player_id, net })))`
- Builds Swish links for transfers where the payee has `players.swish_number`

**Layout (ceremonial):**
1. Hero: session name + date in `font-display`, result badge (e.g. "Anna won big tonight"), `.felt` background
2. Net results list: each player's name + net, sorted biggest win first. Animate in one by one (stagger 100ms each).
3. ♠ divider
4. Transfers section: each Transfer as a card — "Erik pays Anna · 350 kr" + Swish button (if link available) or copy button
5. "Add your Swish number" nudge for players without one (opens inline edit, calls `updatePlayerSwish`)

**`updatePlayerSwish(playerId, swishNumber)`** in `session.ts`:
- Updates `players.swish_number`

**Swish link builder (pure function in `session.ts`):**
```ts
buildSwishLink({ swishNumber, amount, date }: { swishNumber: string; amount: number; date: string }) => string
// Returns: `swish://payment?payee=${swishNumber}&amount=${amount}&message=Poker+${date}`
```
Add a unit test for this function.
