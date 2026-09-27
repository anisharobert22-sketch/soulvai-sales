import { useState } from "react";
import { COLORS, TYPE, SPACE } from "../constants/theme.js";

// v1's fixed starter list - not yet configurable per org. Flagging this
// as a real gap rather than quietly hardcoding it forever: a vendor
// reselling their own hardware will want their own product list here,
// not Accura's.
const DEFAULT_PRODUCTS = ["Accura Lite", "Accura Pro", "POS Terminal", "GST Filing Add-on", "Tally Migration"];

export default function ProductChips({ selected, onChange }) {
  const [customInput, setCustomInput] = useState("");
  const allOptions = Array.from(new Set([...DEFAULT_PRODUCTS, ...selected]));

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
