# chips.ts owns all BB/kr conversion and net-display logic

All big-blind ↔ kr conversion, amount formatting, and net-result display helpers (`netClass`, `netSign`) live in `src/lib/chips.ts`. No other module may inline the `÷100` relationship between `buy_in_amount` and BB size.

## Rationale

The relationship "1 BB = buy_in_amount / 100 kr" is a domain rule with one authoritative source. Before this decision it was inlined as `Math.round(buyInAmount / 100)` or `kr / bbSize` in three separate files (`session.ts`, `routes/+page.svelte`, `MySession.svelte`), and the `chips.ts` module that was meant to own it was bypassed everywhere due to a type mismatch (it accepted a bespoke `SessionConfig` instead of the real `Session` type).

This caused a locality failure: changing the BB formula would require edits in at least three places, and nothing in the type system would catch a drift.

## Decision

`bbSizeKr(session)` is the single authoritative implementation. `formatAmount(kr, displayUnit, session)` is the canonical display formatter. `netClass(net)` and `netSign(net)` are the canonical net-display helpers. All call sites import from `$lib/chips`.

`createSession()` uses `bbSizeKr` to compute the `bb_size` stored in the DB. The `bb_size` column is a derived, cached value for query convenience — `bbSizeKr` remains the formula of record.
