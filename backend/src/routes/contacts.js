const express = require("express");
const { query } = require("../db/queries");
const { requireAuth } = require("../lib/auth");

const router = express.Router();
router.use(requireAuth);

// The "contact picker" step of field capture reads this list - kept
// deliberately simple (name/phone/notes) since v1's job is speed in the
// field, not a full contact-management surface.
router.get("/", async (req, res) => {
  const search = (req.query.q || "").trim();
  const params = [req.user.org_id];
  let sql = "SELECT * FROM contacts WHERE org_id = $1";
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND (name ILIKE $2 OR phone ILIKE $2)`;
  }
  sql += " ORDER BY name LIMIT 50";
  const { rows } = await query(sql, params);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, phone, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const { rows } = await query(
    "INSERT INTO contacts (org_id, name, phone, notes, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [req.user.org_id, name, phone || null, notes || null, req.user.sub]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
