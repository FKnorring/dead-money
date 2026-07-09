# 01 — Play route scaffold + tab layout

Status: ready-for-agent

Replace the stub at `/session/[id]/play` with a real page that:

- Loads `session`, all `seats` (with player names), and all `buy_ins` for the session from Supabase
- Reads `host_token_<sessionId>` and `player_id_<sessionId>` from localStorage to establish identity
- Subscribes to Realtime on `seats` and `buy_ins` for this session
- Renders a fixed bottom tab bar with two tabs: "My Session" and "The Table"
- Renders placeholder content for each tab (will be replaced in issues 02 and 03)
- If the session state is not `active`, redirect back to `/session/[id]` (lobby)

The tab bar should use the design system (felt green active tab, muted inactive, tap-target height).
