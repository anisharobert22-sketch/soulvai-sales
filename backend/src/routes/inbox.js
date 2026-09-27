const express = require("express");
const { query } = require("../db/queries");
const { requireAuth } = require("../lib/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const assignedToMe = req.query.assigned_to_me === "true";
  const params = [req.user.org_id];
  let sql = "SELECT * FROM inbox_items WHERE org_id = $1";
  if (assignedToMe) {
    params.push(req.user.sub);
    sql += ` AND assigned_to = $2`;
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  const { rows } = await query(sql, params);
  res.json(rows);
});

// Coarse unread count off the user's read cursor - see the schema note
// in migrations/001_init.sql for why this isn't per-item read state.
router.get("/unread-count", async (req, res) => {
  const { rows } = await query("SELECT inbox_last_read_at FROM users WHERE id = $1", [req.user.sub]);
  const cursor = rows[0]?.inbox_last_read_at;
  const { rows: countRows } = await query(
    "SELECT COUNT(*)::int AS count FROM inbox_items WHERE org_id = $1 AND created_at > $2",
    [req.user.org_id, cursor]
  );
  res.json({ count: countRows[0].count });
});

router.post("/mark-read", async (req, res) => {
  await query("UPDATE users SET inbox_last_read_at = now() WHERE id = $1", [req.user.sub]);
  res.json({ ok: true });
});

module.exports = router;
