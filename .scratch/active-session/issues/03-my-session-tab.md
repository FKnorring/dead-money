# 03 — My Session tab

Status: ready-for-agent

Build the "My Session" tab content in the play screen. This is the personal live-tracking view — the screen each player stares at during a hand.

**Layout (top to bottom):**
1. **Stats bar** — current stack (large tabular number), total buy-ins, running net (color-coded)
2. **Buy-in section** — labeled "Buy In / Top Up"
   - Primary ChipButton row: 0.5×, 1×, 1.5×, 2× of `session.buy_in_amount` (e.g. 100, 200, 300, 400 kr for a 200kr game)
   - Secondary row (expandable): 0.25×, 2.5×, 3× + "Other" button
   - "Other" opens a Sheet with NumberInput for free-form amount
   - Tapping any amount calls `recordBuyIn`
3. **Stack section** — labeled "Adjust Stack"
   - Primary ChipButton row: –2BB, –1BB, +1BB, +2BB (using `session.bb_size` for conversion)
   - Secondary row (expandable): +0.5BB, +3BB, +4BB + "Set exact" button
   - "Set exact" opens a Sheet with NumberInput for absolute stack value
   - Delta taps call `updateStack(seat.stack + delta)`; exact taps call `updateStack(amount)`
4. **kr/BB toggle** — a small pill toggle in the top-right, stored in localStorage as `display_unit`

**Design:** no poker motifs (this is a functional screen per DESIGN.md). ChipButton's `.btn-action` press feel on all chip buttons. All money values use `.tabular` class. Stack value change animates with a 200ms CSS count roll.

**Host extras:** host sees a "Managing: [player name]" picker at the top to switch which seat they're editing.
