# pokr

A real-time web app for tracking No-Limit Hold'em home cash games — buy-ins, stacks, and settlements — across a recurring group of players.

## Language

### Players & identity

**Player**:
A person in the global registry who can participate in Sessions. Persists across all Sessions; the source of truth for cross-session identity and lifetime statistics.
_Avoid_: user, participant, member

**Host**:
The Player who created a Session. Has elevated permissions within that Session only — can edit any Seat's stack or buy-ins, manage the player list during Lobby, and open/close the Session. Host status is scoped to a single Session; creating a new Session confers no prior host status.
_Avoid_: admin, organizer

**Seat**:
A Player's participation in a specific Session. One Player, one Seat per Session. Tracks claim status (whether the Player has joined on their device), all BuyIns, Stack snapshots, and CashOut.
_Avoid_: entry, position, record

### Session lifecycle

**Session**:
A single poker game night. Progresses through three states: **Lobby** (setup, players joining), **Active** (game in progress, tracking live), **Closed** (game over, Settlement calculated). Host sets the buy-in amount and BB size at creation.
_Avoid_: game, event, table

**Lobby**:
The pre-game state of a Session. The Host configures players and settings. Players claim Seats. No BuyIns are recorded yet.

**Active**:
The in-progress state of a Session. BuyIns and Stack updates are live. Late joiners may still claim or add Seats.

**Closed**:
The terminal state of a Session. All Seats are locked. Settlement is calculated. No further edits are permitted.

### Money tracking

**BuyIn**:
A discrete timestamped event recording that a Player added chips to their stack. Covers both the initial sit-down and any subsequent top-ups — there is no separate concept of a "top-up"; all are BuyIns.
_Avoid_: top-up, rebuy, purchase

**Stack**:
The current chip count for a Seat, expressed as an absolute kr amount. A snapshot entered by the Player or Host — not computed from BuyIn history. Optional during Active; required at CashOut.
_Avoid_: chips, balance

**CashOut**:
The event that closes a Seat, recording the Player's final absolute Stack and locking the Seat from further edits. Can be triggered by the Player themselves or by the Host.
_Avoid_: leave, exit, check-out

**Net**:
Derived value: final Stack minus total BuyIns for a Seat. The authoritative measure of a Player's result for a Session. Positive = winner; negative = loser.
_Avoid_: profit, loss, result, P&L

### Settlement

**Settlement**:
The set of Transfers calculated when a Session closes, zeroing all Player debts using the fewest possible transactions (minimized-transfers algorithm).
_Avoid_: reconciliation, payout, cashout

**Transfer**:
A directed payment from one Player to another, produced by Settlement. Carries a Swish deep link when the payee has a Swish number on their Player record.
_Avoid_: payment, transaction

### History & awards

**StackEvent**:
A timestamped record of a Stack change — either an absolute snapshot or a delta — used to reconstruct how a Player's stack evolved over a Session.
_Avoid_: log entry, history entry

**Award**:
A fun, mocking badge assigned to a Player at Session close based on their stats (e.g. most BuyIns, biggest loss, breaking even). Presented after the statistical summary.
_Avoid_: badge, achievement, trophy

**Leaderboard**:
Cross-session aggregate statistics per Player: total Net, sessions played, win rate, biggest single-session win and loss.
_Avoid_: stats, rankings, hall of fame
