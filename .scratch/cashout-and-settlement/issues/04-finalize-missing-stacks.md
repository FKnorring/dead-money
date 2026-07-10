# 04 — Finalize missing stacks before settlement

Status: completed

## Source

PRD US6: "As a host, I want to fill in missing final stacks for players who didn't respond, so settlement can proceed."

PRD implementation note: "Host can manually fill in remaining stacks from a 'Finalize' screen."

Issue 02: "If any [seats with cashed_out=false exist]: show confirmation sheet listing uncashed players, option to fill in their stacks or proceed anyway."

## What's missing

The current End Session confirmation sheet lists uncashed players with their current stack values but provides no way to edit those values. The host can only proceed (with null final_stack → 0 in settlement) or cancel.

## Proposed approach

- In the End Session sheet in `TheTable.svelte`, for each uncashed-out player, render an inline `NumberInput` pre-filled with `seat.stack ?? null`.
- On "End Session" confirm, call `cashOutSeat` for each player whose input has a value (using the entered amount), then call `closeSession`.
- Players left blank get null final_stack and settle at 0 (as documented in the PRD).

This keeps everything in the existing End Session sheet — no separate route needed.
