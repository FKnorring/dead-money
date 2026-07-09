# Registry-based player identity, not device tokens

Player identity is anchored to a global registry record, not to a browser localStorage token. The Host pre-adds known Players from the registry before a Session starts; new Players search the registry on join, falling back to creating a new record if not found.

This was chosen over a pure localStorage-token approach because the friend group is stable and recurring — the same people play most weeks. Registry identity gives accurate cross-session history and leaderboard stats without any auth system. The trade-off is that a Player on a new device won't be auto-recognised, but in practice the Host setup step handles this before the game starts.
