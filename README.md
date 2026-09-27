# SoulvAI Sales & Customer Care

Workstream D from the Accura build plan: field capture, pipeline, and
inbox for SoulvAI's own sales/CCE teams and for POS-vendor field teams
who resell Accura. Its own repo and service per the plan — separate from
Accura's FastAPI/Postgres backend, sharing only its design tokens, never
its auth.

## Why multi-org from day one

The build plan flagged "who holds the phone in the field" as an open
decision — SoulvAI's own salespeople, or a POS vendor's team — because the
answer decides whether the field app needs the vendor's branding, Tamil
UI, and a login that never touches SoulvAI staff credentials. The answer
came back **both**, so `organizations` (type `internal` | `vendor`) is the
tenant boundary everywhere: every table is scoped by `org_id`, every
query filters by the caller's own org, and there's no cross-org read path
at all (verified — see below).

## Stack

- **Backend**: Express + Socket.io + plain `pg` (node-postgres), hand-written
  SQL migrations in `backend/migrations/`. Prisma was tried first but its
  CLI needs to download engine binaries from `binaries.prisma.sh`, which
  this sandbox's network allowlist doesn't reach — dropped in favor of
  something with zero binary/network dependency to run migrations.
- **Realtime**: Socket.io on a single Node instance, rooms per org and per
  user. Redis stays out until a second instance actually exists, per the
  plan.
- **Auth**: this service's own phone+password JWT login — deliberately
  not shared with Accura's. "Shares Accura's tokens and components" in
  the plan means design tokens (colors/type), not auth tokens.
- **Frontend**: not yet built (next up) — mobile-first field capture +
  desktop pipeline board, reusing Accura's theme constants.

## Status (this pass)

Built and verified against a real local Postgres 16 instance (not
mocked): schema + migrations, auth, contacts, field capture (including a
real multipart voice-note upload), the pipeline board with weighted
value/count per column and rotting-card detection, the objection-reason
gate on Closed Lost (rejected without a reason, accepted with one), round
robin assignment (verified it alternates between two available CCEs and
correctly skips one marked unavailable), the inbox feed with unread
counts via a read-cursor, and follow-up reminders with snooze. Cross-org
isolation verified directly: a vendor org's admin sees zero of SoulvAI's
contacts/cards and gets a 404 (not a leak) reaching for another org's
card by id.

Not yet built: the frontend (field capture UI, pipeline board, inbox),
voice-note transcription (v2 per the plan), and deployment/hosting setup.
Socket.io's live-push side is wired (pipeline moves, assignments,
reminders, new inbox items all emit) but has not been exercised with an
actual connected client yet — only the HTTP API has been driven
end-to-end so far.

## Running it locally

```
cd backend
cp .env.example .env   # point DATABASE_URL at a real Postgres
npm install
node scripts/seed-org.js --name "SoulvAI" --type internal \
  --display-name "SoulvAI Sales" --admin-name "..." \
  --admin-phone "+91..." --admin-password "..."
npm start   # runs migrations, then listens on PORT (default 4100)
```
