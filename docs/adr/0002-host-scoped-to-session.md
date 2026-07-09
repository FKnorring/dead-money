# Host status is scoped to a single Session

A Player is Host of a specific Session only — not of the app globally. Host status is stored as a localStorage token keyed by Session ID (`host_token_<sessionId>`). Opening a new Session grants no host rights in it unless you created it.

This was chosen because the group rotates who hosts. A global "admin" role would require auth and a management UI. Scoping to Session keeps the zero-auth posture while still giving the creator meaningful control over their game night.
