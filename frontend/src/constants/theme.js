// Shared with Accura on purpose: same tokens, same "looks like a ledger"
// identity, so a salesperson moving between Accura and this app never
// feels like they've left the product. Copied rather than imported
// across repos - this is its own deployable service and shouldn't
// depend on Accura's frontend build to ship.
//
// One addition specific to this app: ORG_ACCENT lets a vendor org's
// `primary_color` (set at seed time, see backend/scripts/seed-org.js)
// override the brass accent without touching the rest of the palette -
// that's the "vendor's branding" requirement from the build plan's open
// decision on who holds the phone in the field.

export const COLORS = {
  parchment: "var(--color-parchment)",
  parchmentDeep: "var(--color-parchmentDeep)",
  ink: "var(--color-ink)",
  inkSoft: "var(--color-inkSoft)",
  ledgerGreen: "var(--color-ledgerGreen)",
  ledgerGreenDeep: "var(--color-ledgerGreenDeep)",
  brass: "var(--color-orgAccent, var(--color-brass))",
  correction: "var(--color-correction)",
  amber: "var(--color-amber)",
  border: "var(--color-border)",
  cardBg: "var(--color-cardBg)",
  textOnAccent: "var(--color-textOnAccent)",
};

export const FONTS = {
  display: "'Fraunces', Georgia, serif",
  body: "'Inter', -apple-system, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
};

export const TYPE = {
  hero: { fontSize: "32px", fontFamily: FONTS.display, fontWeight: 600, lineHeight: 1.15 },
  title: { fontSize: "20px", fontFamily: FONTS.display, fontWeight: 500, lineHeight: 1.25 },
  body: { fontSize: "14px", fontFamily: FONTS.body, fontWeight: 400, lineHeight: 1.5 },
  label: { fontSize: "12px", fontFamily: FONTS.body, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.4 },
  data: { fontSize: "14px", fontFamily: FONTS.mono, fontWeight: 500, lineHeight: 1.4, fontVariantNumeric: "tabular-nums" },
};

export const SPACE = { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" };
export const RADIUS = "10px";

export const SHADOWS = {
  card: "0 2px 10px rgba(42, 36, 28, 0.08)",
  stamp: "0 1px 4px rgba(42, 36, 28, 0.25)",
};

export const LEDGER_VARS = {
  "--color-parchment": "#F2E9D8",
  "--color-parchmentDeep": "#E8DCC3",
  "--color-ink": "#2A241C",
  "--color-inkSoft": "#6B6255",
  "--color-ledgerGreen": "#1F5D46",
  "--color-ledgerGreenDeep": "#163F31",
  "--color-brass": "#9C7A44",
  "--color-correction": "#A13A2F",
  "--color-amber": "#C08A2C",
  "--color-border": "#D9CBA8",
  "--color-cardBg": "#FBF7EE",
  "--color-textOnAccent": "#FAF6EC",
};

export const TEMPERATURE_COLORS = {
  cold: "#5B7FA6",
  warm: COLORS.amber,
  hot: COLORS.correction,
};

export const STAGE_LABELS = {
  new_lead: "New lead",
  contacted: "Contacted",
  demo_scheduled: "Demo scheduled",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};

export const STAGES = Object.keys(STAGE_LABELS);
