# Stack is an absolute snapshot, not computed from BuyIn history

A Seat's current Stack is whatever the Player or Host last entered as an absolute value — it is not derived by summing BuyIns and subtracting losses. BuyIns are tracked as discrete events for timeline stats, but Stack is independent of them.

This was chosen because players at a live poker table won't log every pot they win or lose — they'll glance at their chips occasionally and enter a number. Requiring a computed model would mean the Stack is always wrong unless every delta is logged. The hybrid approach (events for BuyIns, snapshot for Stack) matches the actual table behaviour.

## Corollary: first BuyIn seeds the Stack

When a Player's first BuyIn is recorded, `seats.stack` is seeded to that amount so the table shows a non-null value immediately. This is enforced by a Postgres trigger (`trg_seed_stack_on_first_buy_in`, migration `0002_seed_stack_on_first_buy_in.sql`) rather than client-side logic: the trigger fires `AFTER INSERT ON buy_ins` and atomically updates `seats.stack` where it is `NULL`. This eliminates the concurrent-first-buy-in race that a client-side read-modify-write would have.

`recordBuyIn()` in `session.ts` does not need to handle this case — it inserts the BuyIn and the trigger takes care of the rest.
