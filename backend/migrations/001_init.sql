-- SoulvAI Sales & Customer Care service — initial schema.
--
-- Multi-org from day one: the field phone is held by either SoulvAI's own
-- salespeople or a POS vendor's team (confirmed: both happen), so an
-- "organization" is the tenant boundary from the start rather than a
-- single hardcoded SoulvAI account. Each org gets its own branding,
-- default language, and users who never share a login with another org's
-- staff — exactly the two things the open decision said this would hinge on.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('internal', 'vendor')),
  display_name  TEXT NOT NULL,
  logo_url      TEXT,
  primary_color TEXT,
  default_language TEXT NOT NULL DEFAULT 'en' CHECK (default_language IN ('en', 'ta')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('salesperson', 'cce', 'admin')),
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ta')),
  -- CCE-only availability toggle that the round-robin assigner reads.
  -- Meaningless for salespeople/admins but harmless to leave true.
  available     BOOLEAN NOT NULL DEFAULT true,
  -- Coarse read cursor for the inbox feed's unread count - see inbox_items.
  inbox_last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_org ON users(org_id);

CREATE TABLE contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_org ON contacts(org_id);

-- The seven pipeline stages, in order. Stored as a CHECK rather than a
-- separate lookup table - v1 doesn't need per-org custom stages, and a
-- fixed list keeps "weighted value per column" and "rotting cards"
-- trivial to compute.
CREATE TABLE pipeline_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       UUID NOT NULL REFERENCES contacts(id),
  stage            TEXT NOT NULL DEFAULT 'new_lead' CHECK (stage IN (
                     'new_lead', 'contacted', 'demo_scheduled', 'proposal_sent',
                     'negotiation', 'closed_won', 'closed_lost'
                   )),
  value            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  products         TEXT[] NOT NULL DEFAULT '{}',
  temperature      TEXT CHECK (temperature IN ('cold', 'warm', 'hot')),
  assigned_to      UUID REFERENCES users(id),
  -- Enforced again at the API layer (the DB constraint alone can't tell
  -- "reason given" from "reason blank string"), but kept here too as a
  -- last line of defense against a bad direct write.
  objection_reason TEXT,
  CONSTRAINT objection_reason_required_on_closed_lost
    CHECK (stage <> 'closed_lost' OR (objection_reason IS NOT NULL AND length(trim(objection_reason)) > 0)),
  -- Drives "rotting cards": a card with no activity in N days is stale,
  -- computed as now() - last_activity_at, never stored as a boolean.
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_cards_org_stage ON pipeline_cards(org_id, stage);
CREATE INDEX idx_pipeline_cards_assigned ON pipeline_cards(assigned_to);

-- One row per field-capture event ("three taps"): contact + temperature +
-- product chips + optional voice note + optional geotag. Kept distinct
-- from pipeline_cards because a capture is a dated interaction record,
-- not the mutable card state itself - a card accumulates many captures
-- over its life.
CREATE TABLE field_captures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES contacts(id),
  pipeline_card_id UUID REFERENCES pipeline_cards(id),
  temperature      TEXT NOT NULL CHECK (temperature IN ('cold', 'warm', 'hot')),
  products         TEXT[] NOT NULL DEFAULT '{}',
  voice_note_url   TEXT,
  geo_lat          DOUBLE PRECISION,
  geo_lng          DOUBLE PRECISION,
  created_by       UUID NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_field_captures_org ON field_captures(org_id);
CREATE INDEX idx_field_captures_card ON field_captures(pipeline_card_id);

-- The inbox-style live feed. Unread counts are a per-user cursor
-- (users.inbox_last_read_at) rather than a row per user per item -
-- simpler, and "unread count" is the only thing v1 actually asked for,
-- not per-item read/unread state.
CREATE TABLE inbox_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN (
                     'field_capture', 'card_moved', 'reminder_due', 'assignment', 'closed_won'
                   )),
  pipeline_card_id UUID REFERENCES pipeline_cards(id),
  contact_id       UUID REFERENCES contacts(id),
  assigned_to      UUID REFERENCES users(id),
  summary          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_items_org_created ON inbox_items(org_id, created_at DESC);
CREATE INDEX idx_inbox_items_assigned ON inbox_items(assigned_to);

CREATE TABLE follow_up_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pipeline_card_id UUID REFERENCES pipeline_cards(id),
  contact_id       UUID REFERENCES contacts(id),
  assigned_to      UUID NOT NULL REFERENCES users(id),
  due_at           TIMESTAMPTZ NOT NULL,
  snoozed_until    TIMESTAMPTZ,
  note             TEXT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reminders_assigned_due ON follow_up_reminders(assigned_to, due_at);

-- One pointer per (org, role) - round robin just rotates through that
-- role's currently-available users in a stable order (id order) starting
-- after whoever was assigned last.
CREATE TABLE round_robin_pointers (
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role               TEXT NOT NULL,
  last_assigned_user_id UUID REFERENCES users(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, role)
);
