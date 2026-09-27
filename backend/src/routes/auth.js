const express = require("express");
const { query } = require("../db/queries");
const { signToken, checkPassword, hashPassword, requireAuth, requireRole } = require("../lib/auth");

const router = express.Router();

// Phone + password, not email - this is a field-sales tool where the
// phone number is already the identity everyone uses (same reasoning as
// Accura's WhatsApp-first capture).
router.post("/login", async (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: "phone and password are required" });

  const { rows } = await query("SELECT * FROM users WHERE phone = $1", [phone]);
  const user = rows[0];
  if (!user || !(await checkPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }

  const { rows: orgRows } = await query("SELECT * FROM organizations WHERE id = $1", [user.org_id]);
  const org = orgRows[0];

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, language: user.language, available: user.available },
    organization: org && { id: org.id, display_name: org.display_name, type: org.type, logo_url: org.logo_url, primary_color: org.primary_color, default_language: org.default_language },
  });
});

// No public signup: field staff are provisioned by an org admin. An
// org's first admin is created by the platform-level seed script
// (scripts/seed-org.js), not through this API - there's no user yet to
// authorize it.
router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, phone, password, role, language } = req.body || {};
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "name, phone, password, and role are required" });
  }
  if (!["salesperson", "cce", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be salesperson, cce, or admin" });
  }

  const existing = await query("SELECT id FROM users WHERE phone = $1", [phone]);
  if (existing.rows.length) return res.status(409).json({ error: "That phone number is already registered" });

  const password_hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (org_id, name, phone, password_hash, role, language)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'en'))
     RETURNING id, name, phone, role, language, available`,
    [req.user.org_id, name, phone, password_hash, role, language]
  );
  res.status(201).json(rows[0]);
});

router.get("/users", requireAuth, async (req, res) => {
  const { rows } = await query(
    "SELECT id, name, phone, role, language, available FROM users WHERE org_id = $1 ORDER BY name",
    [req.user.org_id]
  );
  res.json(rows);
});

// A CCE's own availability toggle for the round-robin assigner.
router.patch("/users/me/available", requireAuth, async (req, res) => {
  const { available } = req.body || {};
  if (typeof available !== "boolean") return res.status(400).json({ error: "available must be a boolean" });
  await query("UPDATE users SET available = $1 WHERE id = $2", [available, req.user.sub]);
  res.json({ ok: true, available });
});

module.exports = router;
