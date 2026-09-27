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
- **Frontend**: Vite + React, no UI framework - hand-built components
  matching Accura's ledger look (theme.js is a copy of Accura's tokens,
  not an import - this stays independently deployable). React Router for
  the four screens, a plain `fetch` wrapper for the API, `socket.io-client`
  for live updates.

## Status (this pass)

**Backend** - built and verified against a real local Postgres 16
instance (not mocked): schema + migrations, auth, contacts, field capture
(including a real multipart voice-note upload), the pipeline board with
weighted value/count per column and rotting-card detection, the
objection-reason gate on Closed Lost (rejected without a reason, accepted
with one), round robin assignment (verified it alternates between two
available CCEs and correctly skips one marked unavailable), the inbox
feed with unread counts via a read-cursor, and follow-up reminders with
snooze. Cross-org isolation verified directly: a vendor org's admin sees
zero of SoulvAI's contacts/cards and gets a 404 (not a leak) reaching for
another org's card by id.

**Frontend** - login, field capture (contact search/create, temperature,
product chips, press-and-hold voice note, optional geotag), the pipeline
board (drag-and-drop on desktop, a per-card stage picker on phone/tablet
since touch drag-and-drop needs a dedicated library this pass didn't
add), the objection-reason modal gating Closed Lost, and the inbox feed
with unread badges and reminder snooze. Call/WhatsApp buttons use plain
`tel:`/`wa.me` links; "Copy sheet" copies a plain-text summary to the
clipboard. A vendor org's `primary_color` overrides the accent on login.

Verified with a real headless-Chromium run against the real backend and
a real Postgres (not just `npm run build`): logged in, ran a full field
capture, watched the card land on the board immediately, confirmed the
inbox showed the capture event, and on a phone-width viewport confirmed
the objection-reason modal blocks an empty reason and shows the reason
on the card once given. Screenshots from that run are available on
request.

Not yet built: voice-note transcription (v2 per the plan), a real
in-app pipeline-analytics view (v2), deployment/hosting setup, and a
per-org configurable product list (the "what were they interested in"
chips are currently one hardcoded list shared by every org - fine for
SoulvAI's own team, wrong the day a vendor org wants their own product
names there). Socket.io's live-push is wired end to end and was
exercised implicitly by the E2E run (the board updates without a
manual refresh), but no test yet forces two simultaneous browser
sessions to confirm a push from one is seen by the other.

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

```
cd frontend
cp .env.example .env   # point VITE_API_BASE at the backend above
npm install
npm run dev             # http://localhost:5173
```
