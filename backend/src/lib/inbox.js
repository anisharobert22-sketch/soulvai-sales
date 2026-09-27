const { query } = require("../db/queries");
const { emitToOrg, emitToUser } = require("../realtime/io");

/**
 * Every inbox-feed event (a capture came in, a card moved, a reminder
 * fired, a card got assigned) goes through here so posting the row and
 * pushing the live update never drift apart.
 */
async function postInboxItem(orgId, { kind, pipeline_card_id, contact_id, assigned_to, summary }) {
  const { rows } = await query(
    `INSERT INTO inbox_items (org_id, kind, pipeline_card_id, contact_id, assigned_to, summary)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [orgId, kind, pipeline_card_id || null, contact_id || null, assigned_to || null, summary]
  );
  const item = rows[0];
  emitToOrg(orgId, "inbox:new", item);
  if (assigned_to) emitToUser(assigned_to, "inbox:assigned", item);
  return item;
}

module.exports = { postInboxItem };
