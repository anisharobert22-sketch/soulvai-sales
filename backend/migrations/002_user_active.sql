-- Team admin page needs a soft-delete/deactivate for agents (Freshdesk-
-- style: an agent leaving doesn't get deleted - their historical
-- pipeline_cards/field_captures/inbox_items all still reference them -
-- they just get locked out of login and dropped from round robin.
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
