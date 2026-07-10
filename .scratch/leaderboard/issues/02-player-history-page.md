# 02 — Player history page

Status: completed

Build `/player/[id]` — all sessions for a single player.

**Data:** sessions where this player has a seat, joined with buy-in totals and stack events. Sorted newest first.

**Layout:**
1. Header: player name, total net (all-time), sessions played
2. Session list: each session as a card — date/label, net (colored), buy-ins, buy-in count
3. Tap a session card → link to `/session/[id]/end` (settlement screen for that session)
4. Stack timeline chart (only if `stack_events` exist for that session) — use the `/dataviz` skill when building this chart section
