# PRD: Leaderboard & Player History

Status: ready-for-agent

## Problem Statement

Players want to see how they and their friends have performed across all sessions — total profit, win rate, biggest wins and losses. Right now there's only a list of recent sessions on the home screen with no per-player stats.

## Solution

A Leaderboard screen accessible from the home screen showing cross-session stats per Player, plus a per-player history view showing all their sessions.

## User Stories

1. As a player, I want to see a leaderboard of all players ranked by total net profit, so I can brag or be shamed.
2. As a player, I want to see each player's win rate (% sessions profitable), so I know who's consistently good vs lucky.
3. As a player, I want to see each player's biggest single-session win and loss, so I know the extreme outcomes.
4. As a player, I want to see how many sessions each player has played, so I know who's a regular.
5. As a player, I want to tap any player on the leaderboard to see their full session history, so I can investigate their record.
6. As a player, I want the leaderboard to be publicly accessible to anyone with the app URL, so friends can check it without joining a session.
7. As a player, I want the leaderboard to feel ceremonial — display font, gold accent for #1, suits as dividers — so it's a satisfying screen to visit.
8. As a player, I want the leaderboard stats to update after each session closes, so it's always current.
9. As a player, I want to see a per-session timeline chart showing how my stack evolved during a game, so I can relive the swings.

## Implementation Decisions

- **Route:** `/leaderboard` — standalone page, no session context needed.
- **Data source:** query `seats` joined with `players` and `buy_ins` across all closed sessions. Compute per player:
  - `totalNet`: sum of `(final_stack ?? 0) - totalBuyIns` across all closed sessions where the player has a seat with `cashed_out=true`
  - `sessionsPlayed`: count of sessions with a seat
  - `wins`: count of sessions where net > 0
  - `winRate`: wins / sessionsPlayed
  - `biggestWin`: max net in a single session
  - `biggestLoss`: min net in a single session
- These are computed client-side from raw seat + buy_in data. No DB views or functions required for now (keep it simple; optimise later if slow).
- New lib helper: `loadLeaderboardData()` in `session.ts` — returns all closed sessions' seats with player names + buy-in totals. Client aggregates.
- **Leaderboard design (ceremonial):**
  - #1 player highlighted in gold
  - `font-display` for rank numbers
  - ♠ dividers between sections
  - Stats animate in on first render (cascade)
- **Player history page (`/player/[id]`):**
  - All sessions this player participated in, sorted newest first
  - Per session: date, net, total buy-ins, buy-in count
  - Stack timeline chart using `stack_events` for sessions where events were recorded (use `/dataviz` skill when building this)
- **Home screen link:** add a "Leaderboard →" link/button to the home screen below the recent sessions list.

## Testing Decisions

- Leaderboard aggregation is pure computation over data — no new unit tests needed beyond the existing `calculateNet` tests.
- If a `buildLeaderboard(sessions)` pure function is extracted, test it with known multi-session data and expected rankings.
- Prior art: `settlement.test.ts` pattern (known inputs → literal expected outputs).

## Out of Scope

- Real-time leaderboard updates (it refreshes on page load; a "refresh" button is sufficient)
- H2H (head-to-head) records in v1
- Filtering by date range

## Further Notes

- The stack timeline chart (per-session view) requires `stack_events` to have been written. Since StackEvent recording is being added in the active-session feature, older sessions won't have timeline data — show "No timeline data" gracefully.
- Gold accent (`--color-gold`, `--color-gold-light`) is reserved for ceremony — the leaderboard is the right place for it (leaderboard top spot, biggest win).
