# 04 — The Table tab

Status: ready-for-agent

Build the "The Table" tab content in the play screen. This is the live scoreboard — all players can see everyone's position.

**Layout:**
- List of all active (non-cashed-out) seats using `PlayerRow` component
- Each row: player name, current stack, net (stack – total buy-ins via `calculateNet`)
- `isYou` set on the current player's row (green left border highlight)
- Sorted by net descending (biggest winner at top)
- `trailing` snippet on each row: for host only — a small "Cash Out" button that initiates the cashout flow for that player (links to cashout-and-settlement feature)
- Cashed-out players shown in a collapsed "Cashed Out" section at the bottom with their final net

**Realtime:** the parent play route already manages the Realtime subscription. This tab just reads from the shared `seats` and `buyInTotals` state.

**Design:** functional screen — no felt texture, no display font, no suit motifs. Clean, fast, readable.

**kr/BB toggle:** respects the global `display_unit` preference from My Session tab.
