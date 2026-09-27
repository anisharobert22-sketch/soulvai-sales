const express = require("express");
const { query } = require("../db/queries");
const { requireAuth } = require("../lib/auth");
const { postInboxItem } = require("../lib/inbox");
const { emitToOrg } = require("../realtime/io");
const { assignRoundRobin } = require("../lib/roundRobin");

const router = express.Router();
router.use(requireAuth);

const STAGES = ["new_lead", "contacted", "demo_scheduled", "proposal_sent", "negotiation", "closed_won", "closed_lost"];
const ROTTING_DAYS = Number(process.env.ROTTING_DAYS || 5);

// The whole board in one call: seven columns, each with its cards, a
// weighted value (sum of card value - v1 doesn't model per-stage win
// probability, so "weighted" here just means "this column's total,"
// which is the number a salesperson actually wants to see live), a
// count, and each card flagged `rotting` if untouched past the threshold.
router.get("/board", async (req, res) => {
  const { rows } = await query(
    `SELECT pc.*, c.name AS contact_name, c.phone AS contact_phone,
            (now() - pc.last_activity_at) > ($2 || ' days')::interval AS rotting
     FROM pipeline_cards pc
     JOIN contacts c ON c.id = pc.contact_id
     WHERE pc.org_id = $1
     ORDER BY pc.updated_at DESC`,
    [req.user.org_id, ROTTING_DAYS]
  );

  const board = Object.fromEntries(STAGES.map((s) => [s, { value: 0, count: 0, cards: [] }]));
  for (const card of rows) {
    const column = board[card.stage];
    if (!column) continue;
    column.cards.push(card);
    column.count += 1;
    column.value += Number(card.value);
  }
  res.json({ stages: STAGES, board });
});

router.post("/", async (req, res) => {
  const { contact_id, value, products, temperature, assigned_to } = req.body || {};
  if (!contact_id) return res.status(400).json({ error: "contact_id is required" });

  const { rows } = await query(
    `INSERT INTO pipeline_cards (org_id, contact_id, value, products, temperature, assigned_to, created_by)
     VALUES ($1, $2, COALESCE($3, 0), COALESCE($4, '{}'::text[]), $5, $6, $7)
     RETURNING *`,
    [req.user.org_id, contact_id, value || null, products || null, temperature || null, assigned_to || null, req.user.sub]
  );
  res.status(201).json(rows[0]);
});

// Drag-and-drop lands here. Moving INTO closed_lost requires an
// objection_reason in the same request - the DB constraint would catch a
// bare stage-only update anyway, but this returns a clear 400 instead of
// a raw constraint-violation error.
router.patch("/:id/stage", async (req, res) => {
  const { stage, objection_reason } = req.body || {};
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of: ${STAGES.join(", ")}` });
  if (stage === "closed_lost" && !(objection_reason && objection_reason.trim())) {
    return res.status(400).json({ error: "objection_reason is required when moving a card to closed_lost" });
  }

  const { rows } = await query(
    `UPDATE pipeline_cards
     SET stage = $1, objection_reason = CASE WHEN $1 = 'closed_lost' THEN $2 ELSE objection_reason END,
         last_activity_at = now(), updated_at = now()
     WHERE id = $3 AND org_id = $4
     RETURNING *`,
    [stage, objection_reason || null, req.params.id, req.user.org_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Card not found" });
  const card = rows[0];

  emitToOrg(req.user.org_id, "pipeline:card_moved", card);
  await postInboxItem(req.user.org_id, {
    kind: stage === "closed_won" ? "closed_won" : "card_moved",
    pipeline_card_id: card.id,
    contact_id: card.contact_id,
    assigned_to: card.assigned_to,
    summary: stage === "closed_won" ? "Closed won!" : `Moved to ${stage.replace("_", " ")}`,
  });

  res.json(card);
});

router.patch("/:id/assign", async (req, res) => {
  const { assigned_to } = req.body || {};
  const { rows } = await query(
    "UPDATE pipeline_cards SET assigned_to = $1, updated_at = now() WHERE id = $2 AND org_id = $3 RETURNING *",
    [assigned_to || null, req.params.id, req.user.org_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Card not found" });
  const card = rows[0];
  emitToOrg(req.user.org_id, "pipeline:card_moved", card);
  if (assigned_to) {
    await postInboxItem(req.user.org_id, {
      kind: "assignment",
      pipeline_card_id: card.id,
      contact_id: card.contact_id,
      assigned_to,
      summary: "Assigned to you",
    });
  }
  res.json(card);
});

// Used when a new inbound lead needs a CCE right now rather than a
// specific person picked by hand - rotates through whoever has their
// available toggle on.
router.post("/:id/assign-round-robin", async (req, res) => {
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: "role is required (e.g. 'cce')" });

  const chosen = await assignRoundRobin(req.user.org_id, role);
  if (!chosen) return res.status(409).json({ error: `No ${role} is currently marked available` });

  const { rows } = await query(
    "UPDATE pipeline_cards SET assigned_to = $1, updated_at = now() WHERE id = $2 AND org_id = $3 RETURNING *",
    [chosen, req.params.id, req.user.org_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Card not found" });
  const card = rows[0];
  emitToOrg(req.user.org_id, "pipeline:card_moved", card);
  await postInboxItem(req.user.org_id, {
    kind: "assignment", pipeline_card_id: card.id, contact_id: card.contact_id,
    assigned_to: chosen, summary: "Assigned to you (round robin)",
  });
  res.json(card);
});

module.exports = router;
