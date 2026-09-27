import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api.js";
import { COLORS, TYPE, SPACE, RADIUS } from "../constants/theme.js";

// The other half of "three taps": search-and-pick beats a long
// alphabetical list, and creating a brand-new contact inline (no
// separate screen) matters because a lot of field visits are to
// someone who isn't in the book yet.
export default function ContactPicker({ selected, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (selected) return;
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      api.searchContacts(query).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  async function createContact() {
    if (!newName.trim()) return;
    const contact = await api.createContact({ name: newName.trim(), phone: newPhone.trim() || undefined });
    onSelect(contact);
    setShowNewForm(false);
    setNewName("");
    setNewPhone("");
  }

  if (selected) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: RADIUS, border: `1.5px solid ${COLORS.border}`, background: COLORS.cardBg }}>
        <div>
          <div style={{ ...TYPE.body, fontWeight: 600 }}>{selected.name}</div>
          {selected.phone && <div style={{ ...TYPE.body, fontSize: "12.5px", color: COLORS.inkSoft }}>{selected.phone}</div>}
        </div>
        <button onClick={() => onSelect(null)} style={{ ...TYPE.body, fontSize: "12.5px", background: "none", border: "none", color: COLORS.brass, cursor: "pointer" }}>
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search contacts by name or phone..."
        style={{ ...TYPE.body, width: "100%", padding: "12px", borderRadius: RADIUS, border: `1.5px solid ${COLORS.border}`, background: COLORS.cardBg }}
      />
      {results.length > 0 && (
        <div style={{ marginTop: SPACE.xs, border: `1.5px solid ${COLORS.border}`, borderRadius: RADIUS, overflow: "hidden" }}>
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: COLORS.cardBg, border: "none", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", ...TYPE.body }}
            >
              {c.name}{c.phone ? ` — ${c.phone}` : ""}
            </button>
          ))}
        </div>
      )}

      {!showNewForm ? (
        <button
          onClick={() => setShowNewForm(true)}
          style={{ ...TYPE.body, fontSize: "13px", color: COLORS.brass, background: "none", border: "none", cursor: "pointer", marginTop: SPACE.sm, padding: 0 }}
        >
          + New contact
        </button>
      ) : (
        <div style={{ marginTop: SPACE.sm, display: "flex", flexDirection: "column", gap: SPACE.xs }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" style={{ ...TYPE.body, padding: "10px", borderRadius: "6px", border: `1.5px solid ${COLORS.border}` }} />
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone (optional)" style={{ ...TYPE.body, padding: "10px", borderRadius: "6px", border: `1.5px solid ${COLORS.border}` }} />
          <button onClick={createContact} style={{ ...TYPE.body, padding: "10px", borderRadius: "6px", border: "none", background: COLORS.ledgerGreen, color: COLORS.textOnAccent, cursor: "pointer" }}>
            Create & select
          </button>
        </div>
      )}
    </div>
  );
}
