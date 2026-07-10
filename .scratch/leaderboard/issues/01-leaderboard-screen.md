# 01 — Leaderboard screen

Status: completed

Build `/leaderboard` — a public ceremonial screen showing cross-session player rankings.

**Data:** `loadLeaderboardData()` in `session.ts` — fetches all closed sessions' seats with player names and buy-in totals. Client-side aggregation into per-player stats (totalNet, sessionsPlayed, winRate, biggestWin, biggestLoss).

**Layout:**
1. Ceremonial header: "Leaderboard" in `font-display`, ♠♥♦♣, `.felt` background strip
2. Ranked player list (sorted by totalNet descending):
   - Rank number (#1 in gold, rest in muted)
   - Player name
   - Total net (color-coded positive/negative)
   - Sessions played + win rate
   - Tap → navigates to `/player/[id]`
3. Stats cascade in on render (stagger 80ms per row)

**Home screen:** add "Leaderboard →" link below the recent sessions list.
