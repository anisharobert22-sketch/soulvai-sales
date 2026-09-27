const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { query } = require("../db/queries");
const { requireAuth } = require("../lib/auth");
const { postInboxItem } = require("../lib/inbox");

const router = express.Router();
router.use(requireAuth);

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "voice-notes");
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname) || ".m4a"}`),
});
// 5MB is generous for a press-and-hold voice note - a field visit isn't a podcast.
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// The whole point of "three taps": contact + temperature + product chips
// is the only required input, voice note and geotag are optional
// enrichments on top. If no pipeline_card_id is given, a fresh card is
// created in new_lead so a capture always has somewhere to live on the
// board.
router.post("/", upload.single("voice_note"), async (req, res) => {
  const { contact_id, pipeline_card_id, temperature, geo_lat, geo_lng } = req.body;
  let products = req.body.products;
  if (typeof products === "string") {
    try { products = JSON.parse(products); } catch { products = products.split(",").map((p) => p.trim()).filter(Boolean); }
  }
  products = Array.isArray(products) ? products : [];

  if (!contact_id) return res.status(400).json({ error: "contact_id is required" });
  if (!["cold", "warm", "hot"].includes(temperature)) {
    return res.status(400).json({ error: "temperature must be cold, warm, or hot" });
  }

  let cardId = pipeline_card_id || null;
  if (cardId) {
    const owned = await query("SELECT id FROM pipeline_cards WHERE id = $1 AND org_id = $2", [cardId, req.user.org_id]);
    if (!owned.rows.length) return res.status(404).json({ error: "pipeline_card_id not found for this org" });
    await query(
      "UPDATE pipeline_cards SET temperature = $1, products = $2, last_activity_at = now(), updated_at = now() WHERE id = $3",
      [temperature, products, cardId]
    );
  } else {
    const { rows } = await query(
      `INSERT INTO pipeline_cards (org_id, contact_id, temperature, products, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
      [req.user.org_id, contact_id, temperature, products, req.user.sub]
    );
    cardId = rows[0].id;
  }

  const voice_note_url = req.file ? `/uploads/voice-notes/${req.file.filename}` : null;

  const { rows: captureRows } = await query(
    `INSERT INTO field_captures (org_id, contact_id, pipeline_card_id, temperature, products, voice_note_url, geo_lat, geo_lng, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [req.user.org_id, contact_id, cardId, temperature, products, voice_note_url, geo_lat || null, geo_lng || null, req.user.sub]
  );
  const capture = captureRows[0];

  await postInboxItem(req.user.org_id, {
    kind: "field_capture",
    pipeline_card_id: cardId,
    contact_id,
    summary: `New ${temperature} capture${products.length ? " - " + products.join(", ") : ""}`,
  });

  res.status(201).json({ ...capture, pipeline_card_id: cardId });
});

module.exports = router;
