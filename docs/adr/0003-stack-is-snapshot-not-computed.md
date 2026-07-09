# Stack is an absolute snapshot, not computed from BuyIn history

A Seat's current Stack is whatever the Player or Host last entered as an absolute value — it is not derived by summing BuyIns and subtracting losses. BuyIns are tracked as discrete events for timeline stats, but Stack is independent of them.

This was chosen because players at a live poker table won't log every pot they win or lose — they'll glance at their chips occasionally and enter a number. Requiring a computed model would mean the Stack is always wrong unless every delta is logged. The hybrid approach (events for BuyIns, snapshot for Stack) matches the actual table behaviour.
