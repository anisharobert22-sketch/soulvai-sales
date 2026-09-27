const express = require("express");
const { query } = require("../db/queries");
const { requireAuth } = require("../lib/auth");
const { emitToUser } = require("../realtime/io");

const router = express.Router();
router.use(requireAuth);

// "My" reminders: not yet completed, and either never snoozed or the
// snooze has already lapsed - a snoozed reminder simply doesn't show up
// again until its snoozed_until passes.
router.get("/mine", async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM follow_up_reminders
     WHERE assigned_to = $1 AND completed_at IS NULL
       AND (snoozed_until IS NULL OR snoozed_until <= now())
     ORDER BY due_at ASC`,
    [req.user.sub]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { pipeline_card_id, contact_id, assigned_to, due_at, note } = req.body || {};
  if (!due_at) return res.status(400).json({ error: "due_at is required" });
  const { rows } = await query(
    `INSERT INTO follow_up_reminders (org_id, pipeline_card_id, contact_id, assigned_to, due_at, note)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.org_id, pipeline_card_id || null, contact_id || null, assigned_to || req.user.sub, due_at, note || null]
  );
  const reminder = rows[0];
  emitToUser(reminder.assigned_to, "reminder:new", reminder);
  res.status(201).json(reminder);
});

router.patch("/:id/snooze", async (req, res) => {
  const { snoozed_until } = req.body || {};
  if (!snoozed_until) return res.status(400).json({ error: "snoozed_until is required" });
  const { rows } = await query(
    "UPDATE follow_up_reminders SET snoozed_until = $1 WHERE id = $2 AND org_id = $3 RETURNING *",
    [snoozed_until, req.params.id, req.user.org_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Reminder not found" });
  res.json(rows[0]);
});

router.patch("/:id/complete", async (req, res) => {
  const { rows } = await query(
    "UPDATE follow_up_reminders SET completed_at = now() WHERE id = $1 AND org_id = $2 RETURNING *",
    [req.params.id, req.user.org_id]
  );
  if (!rows.length) return res.status(404).json({ error: "Reminder not found" });
  res.json(rows[0]);
});

module.exports = router;
