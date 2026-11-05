# Godscar API (phase 1)

This service runs the existing simulation on the server and stores one character per account in PostgreSQL. It is a local development scaffold; it is not ready to expose publicly.

## Local setup

Requirements: Node 22+, PostgreSQL, and the repository's existing `web/src/sim.js`.

```sh
npm install
createdb godscar
DATABASE_URL=postgres://localhost/godscar \
PUBLIC_BASE_URL=http://localhost:3000 \
DEV_LOGIN_LINKS=true \
npm start
```

Request a sign-in link with `POST /auth/request-link` and `{"email":"you@example.com"}`. In development, the one-time link is printed to the server log. Opening it shows a confirmation page; the link is consumed only after the player presses Continue, so email link scanners cannot silently use it. The link expires after 15 minutes. The session cookie is HTTP-only and lasts 30 days.

## Endpoints

- `GET /health`
- `POST /auth/request-link` — development only; rate limited by source IP.
- `GET /auth/verify?token=…` — displays an explicit confirmation page.
- `POST /auth/verify` — consumes a one-time link and sets the session cookie.
- `POST /auth/logout`
- `GET /api/me`
- `POST /api/character` with `{ "class": "warrior" }` — creates the account's single character.
- `GET /api/character` — catches the character up using server time, capped by the sim's offline limit.
- `POST /api/action` with `{ "simVersion": 4, "action": {…} }` — serializes actions for the character, catches up first, and applies the validated sim action.

Every action response returns the authoritative state and a monotonically increasing character version. Invalid game actions are rejected by the sim but still persist the elapsed server-side catch-up.

## Not ready for public deployment

- The UI still uses browser storage and does not call this API.
- Magic links are logged, not emailed. Startup requires an explicit `DEV_LOGIN_LINKS=true` local-only setting and fails closed in production or when that setting is absent.
- No deploy target or database has been selected or provisioned.
- Add durable migrations, operational monitoring, account recovery, and abuse controls before opening registration.
