import { useState } from "react";
import { COLORS, TYPE, SPACE, RADIUS } from "../constants/theme.js";
import { PrimaryButton, SecondaryButton } from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";

// The backend rejects a bare stage-only move to closed_lost (see
// pipeline_cards' objection_reason_required_on_closed_lost constraint),
// so the UI asks for the reason up front instead of letting the drop
// silently fail.
export default function ObjectionReasonModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(42,36,28,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: SPACE.lg }}>
      <Card style={{ padding: SPACE.lg, width: "100%", maxWidth: "360px" }}>
        <div style={{ ...TYPE.title, marginBottom: SPACE.sm }}>Why was this lost?</div>
        <div style={{ ...TYPE.body, fontSize: "13px", color: COLORS.inkSoft, marginBottom: SPACE.md }}>
          A reason is required before this card can move to Closed Lost.
        </div>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Too expensive vs current vendor"
          rows={3}
          style={{ ...TYPE.body, width: "100%", padding: "10px", borderRadius: RADIUS, border: `1.5px solid ${COLORS.border}`, marginBottom: SPACE.md, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: SPACE.sm, justifyContent: "flex-end" }}>
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>Confirm</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
