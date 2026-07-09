# PRD: Session Awards

Status: ready-for-agent

## Problem Statement

The end of a session is the most social moment of the night. Right now the settlement screen just shows numbers. Awards add ceremony, mocking, and personality — they should make everyone laugh (or wince).

## Solution

After the transfer list on the settlement screen, display a set of Awards — one per notable stat. Each award has a name, an icon, the recipient, and a mocking description. Awards should mock everyone: winners, losers, and especially break-evens.

## Vocab

Use poker language in a fun and witty ways like. Our group uses the following words, jokes and phrases a lot:
fish, nit, nutted, board coverage (when playing a bad hand big pre-flop), in-joke: J7 is the most winningest hand in poker

## User Stories

1. As a player, I want to see fun mocking badges at the end of the session, so the settlement screen feels like a ceremony.
2. As a player, I want each award to have a theatrical entrance animation, so each reveal feels dramatic.
3. As a player, I want the awards to cover multiple categories (biggest win, biggest loss, most buy-ins, break-even, first to bust, biggest comeback), so there's something for everyone.
4. As a player, I want the award descriptions to be witty and mocking, so we all laugh regardless of outcome.
5. As a player, I want the stats underlying each award to be visible, so the award feels earned.
6. As a player, I want award texts to be unique so that i am not bored when i see the same text in another session

## Implementation Decisions

- **Pure function `calculateAwards(seats: AwardInput[]): Award[]`** in a new `src/lib/awards.ts` module.
- `AwardInput`: `{ name: string; net: number; totalBuyIns: number; finalStack: number | null; buyInCount: number }`
- `Award`: `{ id: string; recipientName: string; title: string; description: string; stat: string }`
- Award categories (all must be populated — mock the result however it comes out):

| Award ID           | Condition                                                                        | Mock tone                           |
| ------------------ | -------------------------------------------------------------------------------- | ----------------------------------- |
| `biggest-winner`   | highest net                                                                      | backhanded congratulations          |
| `biggest-loser`    | lowest net (most negative)                                                       | commiseration                       |
| `break-even`       | net closest to 0                                                                 | pure mockery of pointlessness       |
| `most-buyins`      | most buy-in events                                                               | "the fish award"                    |
| `last-stand`       | cashed out last (latest `cashed_out_at`)                                         | heroic or pathetic depending on net |
| `first-bust`       | first to cash out with negative net                                              | swift defeat                        |
| `biggest-comeback` | biggest positive swing (final_stack - first_stack after first_buyin, if tracked) | grudging respect                    |

- Awards are computed client-side at session end — not stored in the DB.
- The `awards.ts` module is a pure function with no DB dependency. Test with known inputs and expected award assignments.

## Testing Decisions

- **`calculateAwards`** is a pure function — test it like `calculateSettlement`: known-input → expected-output with literal expected values.
- Test cases: 3-player session where each award winner is unambiguous; edge case where two players tie (award goes to both or the first alphabetically).
- Prior art: `settlement.test.ts` and `net.test.ts` in `src/lib/`.

## Out of Scope

- Persistent award history (e.g. "most-buyins lifetime champion")
- User-configurable award names
- Award sharing (screenshot etc.)

## Further Notes

- Award descriptions should be written into the `awards.ts` module as static strings keyed to award ID. Keep them punchy and short (one sentence max). Examples:
  - `biggest-winner`: "Beginner's luck or genuine skill? Either way, collect your chips."
  - `break-even`: "Congratulations on your net-zero. A masterpiece of pointlessness."
  - `most-buyins`: "Your dedication to losing money is unmatched. The table thanks you."
