# Design Direction — dead-money

> High-end private card room, not Vegas casino. Functional during play, theatrical at the right moments.

## Philosophy

The app lives in two modes:

- **Live tracking** — someone is mid-hand, glancing at their phone. Zero cognitive load. Fast taps. Numbers that are instantly readable. Nothing moves unless it's telling you something changed.
- **Ceremony** — lobby, session end, awards, leaderboard. This is where the drama lives. Typography gets character, motion gets expressive, the poker soul shows.

Never let the ceremonial bleeds into the functional.

---

## Color

| Role | Color | Usage |
|---|---|---|
| Background | `#0a120d` (near-black, subtle green undertone) | Base surface — implies felt without stating it |
| Surface | `#111a13` | Cards, panels, elevated elements |
| Border | `#1e2e20` | Subtle separators |
| Primary | Felt green (`#35654d` range) | Buttons, active states, interactive elements, your own Seat highlight |
| Secondary | Red (`#c0392b` range) | Losses, negative Net, destructive actions, urgency |
| Reserved | Gold (`#d4a017` range) | Leaderboard #1, session biggest win, Awards — earns every appearance |
| Text primary | `#f0f0e8` | Near-white, slightly warm |
| Text secondary | `#6b7c6d` | Labels, metadata, timestamps |

**Semantic rules:**
- Green = do this / active / positive
- Red = loss / danger / negative Net
- Gold = exceptional / ceremony only — never used for functional UI

---

## Typography

**Functional screens** (My Session, The Table — any live tracking view):
- Typeface: `Space Grotesk` for all text
- All money and stack values: forced tabular figures (`font-variant-numeric: tabular-nums`) so columns align and numbers don't jump width when they change
- No display type. Pure legibility.

**Ceremonial screens** (Lobby, Session End, Awards, Leaderboard):
- Headings and big hero numbers: display font with card-room character (TBD at implementation — target: geometric with edge, e.g. `Bebas Neue`, `Playfair Display`, or similar)
- Body and labels: `Space Grotesk` as base
- Award titles and ceremony moments get the display font treatment

---

## Depth & Interaction

- **Action buttons** (buy-in quick-selects, stack delta buttons): subtle box-shadow depth at rest, scale-down + shadow-collapse on press. Feels like pushing a chip into the pot. Satisfying on repeat taps.
- **Everything else**: flat. No shadows, no gradients on functional elements.
- **Tap targets**: generously sized — minimum 48px, preference for 56–64px on primary actions. This is used one-handed, mid-game.

---

## Poker References

Earned, not applied. Each reference has a specific home:

| Motif | Where |
|---|---|
| ♠ ♥ ♦ ♣ suit symbols | App icon, section dividers on leaderboard, award screen bullet points |
| Chip-styled buttons | Buy-in quick-select buttons only — circular, colored by multiplier |
| Felt texture | Lobby background, session-end background — never during live tracking |

**Hard rule:** no poker motifs on live tracking screens (My Session, The Table). They belong to ceremony only.

---

## Motion

**Live session screens — functional motion only:**
- Stack value changes: brief 200ms count-up/down roll — communicates *what changed* at a glance
- New player joining: slide-in from bottom
- Nothing else moves

**Ceremonial screens — expressive:**
- Lobby entrance: elements settle in with weight
- Session end: net results slam in one by one, winners announced with presence
- Awards screen: each award gets a theatrical entrance — suits animate, names land with impact
- Leaderboard: numbers cascade in

**Principle:** motion budget is spent on ceremony. Live play stays silent.

---

## Screen Register Summary

| Screen | Typography | Motion | Poker motifs | Depth |
|---|---|---|---|---|
| Lobby | Display + functional | Expressive | Felt texture, suits | Full |
| My Session | Functional only | Functional only | None | Buttons only |
| The Table | Functional only | Functional only | None | Buttons only |
| Session End | Display + functional | Expressive | Felt texture, suits | Full |
| Awards | Display + functional | Expressive | Suits, chip colors | Full |
| Leaderboard | Display + functional | Moderate | Suits as dividers | Full |
