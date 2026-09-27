/**
 * Bootstraps one organization plus its first admin user. There's no
 * public signup by design (see routes/auth.js) - a brand-new org (SoulvAI
 * itself, or a POS vendor partner) has to start somewhere, and this is it.
 *
 * Usage:
 *   node scripts/seed-org.js --name "SoulvAI" --type internal \
 *     --display-name "SoulvAI Sales" --language en \
 *     --admin-name "Viswanathan" --admin-phone "+919999999999" --admin-password "changeme"
 */
require("dotenv").config();
const { query } = require("../src/db/queries");
const { hashPassword } = require("../src/lib/auth");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

async function main() {
  const name = arg("name");
  const type = arg("type", "internal");
  const displayName = arg("display-name", name);
  const language = arg("language", "en");
  const adminName = arg("admin-name");
  const adminPhone = arg("admin-phone");
  const adminPassword = arg("admin-password");

  if (!name || !adminName || !adminPhone || !adminPassword) {
    console.error("Required: --name --admin-name --admin-phone --admin-password");
    process.exit(1);
  }
  if (!["internal", "vendor"].includes(type)) {
    console.error("--type must be 'internal' or 'vendor'");
    process.exit(1);
  }

  const { rows: orgRows } = await query(
    `INSERT INTO organizations (name, type, display_name, default_language) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, type, displayName, language]
  );
  const org = orgRows[0];

  const password_hash = await hashPassword(adminPassword);
  const { rows: userRows } = await query(
    `INSERT INTO users (org_id, name, phone, password_hash, role, language) VALUES ($1, $2, $3, $4, 'admin', $5) RETURNING id, name, phone, role`,
    [org.id, adminName, adminPhone, password_hash, language]
  );

  console.log("Organization created:", org);
  console.log("Admin user created:", userRows[0]);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
