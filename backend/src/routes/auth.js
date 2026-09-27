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
  // A deactivated agent (left the team) keeps their historical records but
  // can't log back in - same 401 as a wrong password, deliberately, so a
  // deactivated phone number doesn't reveal "this account exists" to
  // whoever's trying it.
  if (!user.active) {
    return res.status(401).json({ error: "Invalid phone or password" });
  }

  const { rows: orgRows } = await query("SELECT * FROM organizations WHERE id = $1", [user.org_id]);
  const org = orgRows[0];

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, language: user.language, available: user.available },
    organization: org && { id: org.id, display_name: org.display_name, type: org.type, logo_url: org.logo_url, primary_color: org.primary_color, default_language: org.default_language, product_list: org.product_list },
  });
});

// Lets an admin edit the product list their own CCEs/salespeople pick
// from on the capture form (see ProductChips.jsx). Org-scoped by
// req.user.org_id, same as every other admin-only write here - there's
// no cross-org edit path.
router.patch("/organization", requireAuth, requireRole("admin"), async (req, res) => {
  const { product_list } = req.body || {};
  if (!Array.isArray(product_list) || product_list.some((p) => typeof p !== "string")) {
    return res.status(400).json({ error: "product_list must be an array of strings" });
  }
  const cleaned = product_list.map((p) => p.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return res.status(400).json({ error: "product_list can't be empty" });
  }

  const { rows } = await query(
    `UPDATE organizations SET product_list = $1 WHERE id = $2
     RETURNING id, display_name, type, logo_url, primary_color, default_language, product_list`,
    [cleaned, req.user.org_id]
  );
  res.json(rows[0]);
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
    "SELECT id, name, phone, role, language, available, active, created_at FROM users WHERE org_id = $1 ORDER BY name",
    [req.user.org_id]
  );
  res.json(rows);
});

// Team admin page: edit an agent's name/role/language, or deactivate/
// reactivate them. Deliberately not a DELETE - every other table
// (pipeline_cards.assigned_to, field_captures.created_by, etc.) references
// this row, so removing it would either cascade-delete real business
// history or fail on the foreign key. "active = false" is the only safe
// way to remove someone's access.
router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, role, language, active } = req.body || {};
  if (role && !["salesperson", "cce", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be salesperson, cce, or admin" });
  }
  // An admin deactivating their own only-remaining admin account would
  // lock the org out of user management entirely (there'd be no admin
  // left to reactivate anyone, including themselves). Block it outright
  // rather than relying on the admin to notice - this is exactly the kind
  // of click a busy person makes by accident on a list sorted by name.
  if (active === false && req.params.id === req.user.sub) {
    return res.status(400).json({ error: "You can't deactivate your own account" });
  }
  // Same reasoning as the deactivation guard above: an admin changing
  // their own role away from admin (even by an accidental click on a
  // list sorted by name) would leave the org with no admin able to undo
  // it or manage anyone else.
  if (role && role !== "admin" && req.params.id === req.user.sub) {
    return res.status(400).json({ error: "You can't change your own role" });
  }

  const { rows: existingRows } = await query("SELECT id FROM users WHERE id = $1 AND org_id = $2", [req.params.id, req.user.org_id]);
  if (!existingRows.length) return res.status(404).json({ error: "Not found" });

  // A deactivated agent shouldn't stay "available" for round robin to keep
  // considering, so turning active off also turns available off.
  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($1, name),
       role = COALESCE($2, role),
       language = COALESCE($3, language),
       active = COALESCE($4::boolean, active),
       available = CASE WHEN $4::boolean = false THEN false ELSE available END
     WHERE id = $5 AND org_id = $6
     RETURNING id, name, phone, role, language, available, active`,
    [name, role, language, active, req.params.id, req.user.org_id]
  );
  res.json(rows[0]);
});

router.post("/users/:id/reset-password", requireAuth, requireRole("admin"), async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }
  const { rows: existingRows } = await query("SELECT id FROM users WHERE id = $1 AND org_id = $2", [req.params.id, req.user.org_id]);
  if (!existingRows.length) return res.status(404).json({ error: "Not found" });

  const password_hash = await hashPassword(password);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, req.params.id]);
  res.json({ ok: true });
});

// A CCE's own availability toggle for the round-robin assigner.
router.patch("/users/me/available", requireAuth, async (req, res) => {
  const { available } = req.body || {};
  if (typeof available !== "boolean") return res.status(400).json({ error: "available must be a boolean" });
  await query("UPDATE users SET available = $1 WHERE id = $2", [available, req.user.sub]);
  res.json({ ok: true, available });
});

module.exports = router;
