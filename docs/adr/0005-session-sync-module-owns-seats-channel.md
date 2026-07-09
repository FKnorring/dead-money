# useSessionSync owns the seats Realtime channel and seats query

All Supabase Realtime subscriptions for `seats` changes in a Session, and the `loadSeats` re-fetch that follows each change event, are encapsulated in `src/lib/sessionSync.ts`. Routes must not create their own `seats` channels or inline the `select('*, players(id, name, swish_number)')` query.

## Rationale

Before this decision, the lobby page and the play page each maintained near-identical `$effect` blocks that: (a) opened a `seats` Realtime channel, (b) ignored the payload and re-fetched all seats with an inline copy of the join query, and (c) subscribed to session state changes for redirect. The join query string appeared four times in the codebase. Any future route (e.g. the settlement/closed screen) would have repeated the same pattern.

This caused a locality failure: a change to the selected player columns (e.g. adding a `phone` field) required edits in four places, and any change to channel naming or re-fetch strategy had to be made in two places independently.

## Decision

`useSessionSync(sessionId, initialSeats, onUpdate?)` sets up the channel once, calls `loadSeats` on every change, and invokes `onUpdate` with the fresh seats array. Routes call this function and tear it down via the returned `destroy()` handle. The channel name and re-fetch implementation are private to the module.

The session-state channel (for lobby→active and active→closed redirects) is intentionally **not** part of `useSessionSync` because the redirect target differs per route. Routes manage their own session-state channel alongside `useSessionSync`.
