# 03 — Realtime cash-out prompt on session end

Status: ready-for-agent

## Source

PRD US5: "As a host, I want all players to be prompted for their final stack when I end the session, so the numbers are accurate."

PRD implementation note: "Before closing, the app checks for any seats with `cashed_out=false`. If any exist, a realtime prompt appears on those players' screens (via Realtime session subscription) asking them to enter their final stack."

## What's missing

When the host ends the session, uncashed-out players currently receive no prompt. They are silently redirected to `/session/[id]/end` by the existing `sessions` Realtime handler.

## Proposed approach

- When `state` transitions to `closed` in the `sessions` Realtime handler, check if the player's own seat has `cashed_out=false`.
- If so, show a modal/sheet on the `/play` page before redirecting: "The game has ended. Enter your final stack."
- On confirm, call `cashOutSeat` with the entered value, then redirect to `/end`.
- If dismissed without entering (or after a timeout), redirect to `/end` anyway (final_stack will be null → treated as 0 in settlement).

This is a Realtime UX concern that sits in the play page's session subscription handler.
