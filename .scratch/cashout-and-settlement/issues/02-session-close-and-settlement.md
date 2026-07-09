# 02 — Session close + settlement screen

Status: ready-for-agent

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
