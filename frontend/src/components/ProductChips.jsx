import { useState } from "react";
import { COLORS, TYPE, SPACE } from "../constants/theme.js";
import { useAuth } from "../lib/AuthContext.jsx";

// Fallback only for a cached session from before organizations.product_list
// existed (see migration 003) - normal operation always has a real list
// from the org. Each org now edits its own list from the Team page, so a
// vendor reselling their own hardware sees their own products here, not
// SoulvAI/Accura's.
const FALLBACK_PRODUCTS = ["Accura Lite", "Accura Pro", "POS Terminal", "GST Filing Add-on", "Tally Migration"];

export default function ProductChips({ selected, onChange }) {
  const { organization } = useAuth();
  const [customInput, setCustomInput] = useState("");
  const orgProducts = organization?.product_list?.length ? organization.product_list : FALLBACK_PRODUCTS;
  const allOptions = Array.from(new Set([...orgProducts, ...selected]));

  function toggle(product) {
    if (selected.includes(product)) onChange(selected.filter((p) => p !== product));
    else onChange([...selected, product]);
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed)) onChange([...selected, trimmed]);
    setCustomInput("");
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: SPACE.xs, marginBottom: SPACE.sm }}>
        {allOptions.map((product) => {
          const active = selected.includes(product);
          return (
            <button
              key={product}
              onClick={() => toggle(product)}
              style={{
                ...TYPE.body,
                fontSize: "13px",
                padding: "8px 14px",
                borderRadius: "999px",
                border: `1.5px solid ${active ? COLORS.ledgerGreen : COLORS.border}`,
                background: active ? COLORS.ledgerGreen : "transparent",
                color: active ? COLORS.textOnAccent : COLORS.ink,
                cursor: "pointer",
              }}
            >
              {product}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: SPACE.xs }}>
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Other product..."
          style={{ ...TYPE.body, flex: 1, padding: "8px 10px", borderRadius: "6px", border: `1.5px solid ${COLORS.border}`, background: COLORS.cardBg }}
        />
        <button onClick={addCustom} style={{ ...TYPE.body, padding: "8px 14px", borderRadius: "6px", border: `1.5px solid ${COLORS.border}`, background: "none", cursor: "pointer" }}>
          Add
        </button>
      </div>
    </div>
  );
}
