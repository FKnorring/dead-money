-- Migration: seed seats.stack from the first buy-in atomically
--
-- Replaces the non-atomic read-modify-write in recordBuyIn() (session.ts).
-- When a buy_in is inserted and the seat's stack is still NULL, this trigger
-- atomically sets stack to the buy-in amount in the same transaction.
-- Concurrent first buy-ins are safe: the UPDATE only fires when stack IS NULL.

create or replace function seed_stack_from_first_buy_in()
returns trigger
language plpgsql
as $$
begin
  update seats
  set stack = new.amount
  where id = new.seat_id
    and stack is null;
  return new;
end;
$$;

create trigger trg_seed_stack_on_first_buy_in
after insert on buy_ins
for each row
execute function seed_stack_from_first_buy_in();

-- Grant execute on the function to the roles used by the client
grant execute on function seed_stack_from_first_buy_in() to anon, authenticated;
