import { COLORS, TYPE, SPACE, RADIUS, TEMPERATURE_COLORS, STAGES, STAGE_LABELS } from "../constants/theme.js";
import Card from "./ui/Card.jsx";

// "Number as the button: Call, WhatsApp, Copy sheet" - one tap dials or
// opens WhatsApp directly via tel:/wa.me links (no in-app dialer to
// build or maintain), and Copy sheet puts a plain-text summary on the
// clipboard for pasting into whatever the salesperson already uses.
function buildSheetText(card) {
  const lines = [
    `${card.contact_name}${card.contact_phone ? ` (${card.contact_phone})` : ""}`,
    `Stage: ${STAGE_LABELS[card.stage]}`,
    card.value > 0 ? `Value: ₹${Number(card.value).toLocaleString("en-IN")}` : null,
    card.products?.length ? `Interested in: ${card.products.join(", ")}` : null,
    card.temperature ? `Temperature: ${card.temperature}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export default function PipelineCardItem({ card, draggable, onDragStart, onMoveStage, onCopyFeedback }) {
  const rottingStyle = card.rotting ? { borderColor: COLORS.amber, borderWidth: "2px" } : {};

  async function handleCopy() {
    await navigator.clipboard.writeText(buildSheetText(card));
    onCopyFeedback?.();
  }

  return (
    <Card
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, card)}
      style={{ padding: SPACE.md, marginBottom: SPACE.sm, cursor: draggable ? "grab" : "default", ...rottingStyle }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SPACE.xs }}>
        <div style={{ ...TYPE.body, fontWeight: 600 }}>{card.contact_name}</div>
        {card.temperature && (
          <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: TEMPERATURE_COLORS[card.temperature] }}>
            {card.temperature}
          </span>
        )}
      </div>
      {card.value > 0 && <div style={{ ...TYPE.data, fontSize: "13px", marginBottom: SPACE.xs }}>₹{Number(card.value).toLocaleString("en-IN")}</div>}
      {card.products?.length > 0 && (
        <div style={{ ...TYPE.body, fontSize: "12px", color: COLORS.inkSoft, marginBottom: SPACE.xs }}>{card.products.join(", ")}</div>
      )}
      {card.rotting && <div style={{ ...TYPE.body, fontSize: "11px", color: COLORS.amber, fontWeight: 600, marginBottom: SPACE.xs }}>⚠ No activity in a while</div>}
      {card.stage === "closed_lost" && card.objection_reason && (
        <div style={{ ...TYPE.body, fontSize: "11.5px", color: COLORS.correction, fontStyle: "italic", marginBottom: SPACE.xs }}>"{card.objection_reason}"</div>
      )}

      <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.xs, flexWrap: "wrap" }}>
        {card.contact_phone && (
          <>
            <a href={`tel:${card.contact_phone}`} style={pillLinkStyle}>Call</a>
            <a href={`https://wa.me/${card.contact_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" style={pillLinkStyle}>WhatsApp</a>
          </>
        )}
        <button onClick={handleCopy} style={{ ...pillLinkStyle, border: `1px solid ${COLORS.border}`, background: "none", cursor: "pointer" }}>Copy sheet</button>
      </div>

      {onMoveStage && (
        <select
          value={card.stage}
          onChange={(e) => onMoveStage(card, e.target.value)}
          style={{ ...TYPE.body, fontSize: "12px", marginTop: SPACE.xs, width: "100%", padding: "6px", borderRadius: "6px", border: `1px solid ${COLORS.border}` }}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
      )}
    </Card>
  );
}

const pillLinkStyle = {
  fontSize: "11.5px",
  fontWeight: 600,
  padding: "5px 10px",
  borderRadius: "999px",
  border: `1px solid ${COLORS.ledgerGreen}`,
  color: COLORS.ledgerGreen,
  textDecoration: "none",
};
