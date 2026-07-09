# dead-money 🃏

Real-time tracker for NLHE home cash games. Successor to `pkr-szn`.

Track buy-ins and stacks during the game, settle debts at the end, and watch the leaderboard shame your friends across all time.

## What it does

- **Session tracking** — host sets up the game, players join on their phones and track their own buy-ins and stack in real-time
- **Live table view** — everyone can see everyone else's stack, buy-ins, and running P&L
- **Settlement** — minimized-transfer algorithm tells you exactly who pays who, with Swish deep links for the lazy
- **History & leaderboard** — cross-session stats, win rates, biggest wins/losses, and a hall of infamy
- **Awards** — mocking badges at session end for the winners, the losers, and especially the break-evens

## Stack

- [SvelteKit](https://kit.svelte.dev/) — frontend + routing
- [Supabase](https://supabase.com/) — Postgres + real-time subscriptions
- [Vercel](https://vercel.com/) — hosting

## Development

```bash
# Install dependencies
npm install

# Copy env template and fill in your Supabase credentials
cp .env.example .env

# Start dev server
npm run dev
```

## Domain

See [`CONTEXT.md`](./CONTEXT.md) for the canonical glossary and [`docs/adr/`](./docs/adr/) for architectural decisions.

See [`docs/DESIGN.md`](./docs/DESIGN.md) for the UI design direction.

---

_"It's not bad play, it's variance."_
