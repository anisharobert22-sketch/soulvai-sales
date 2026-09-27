import { useState } from "react";
import { api } from "../lib/api.js";
import { COLORS, TYPE, SPACE } from "../constants/theme.js";
import { PrimaryButton } from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import ContactPicker from "../components/ContactPicker.jsx";
import TemperatureButtons from "../components/TemperatureButtons.jsx";
import ProductChips from "../components/ProductChips.jsx";
import VoiceNoteRecorder from "../components/VoiceNoteRecorder.jsx";

// "Optional geotag" - requested only when the salesperson chooses to
// attach one, never silently in the background, and a denial or an
// unsupported browser just means the field submits without it.
function useGeoTag() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | locating | attached | denied | unsupported

  function attach() {
    if (!navigator.geolocation) { setStatus("unsupported"); return; }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus("attached"); },
      () => setStatus("denied"),
      { timeout: 8000 }
    );
  }

  function clear() {
    setCoords(null);
    setStatus("idle");
  }

  return { coords, status, attach, clear };
}

export default function CapturePage() {
  const [contact, setContact] = useState(null);
  const [temperature, setTemperature] = useState(null);
  const [products, setProducts] = useState([]);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const geo = useGeoTag();

  const canSubmit = contact && temperature && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("contact_id", contact.id);
      formData.append("temperature", temperature);
      formData.append("products", JSON.stringify(products));
      if (geo.coords) {
        formData.append("geo_lat", geo.coords.lat);
        formData.append("geo_lng", geo.coords.lng);
      }
      if (voiceBlob) formData.append("voice_note", voiceBlob, "voice-note.webm");

      await api.submitFieldCapture(formData);
      setSuccess(`Logged: ${contact.name} - ${temperature}`);
      setContact(null);
      setTemperature(null);
      setProducts([]);
      setVoiceBlob(null);
      geo.clear();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      <h1 style={{ ...TYPE.title, marginBottom: SPACE.lg }}>Field capture</h1>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.md }}>
        <SectionLabel n={1} text="Who did you visit?" />
        <ContactPicker selected={contact} onSelect={setContact} />
      </Card>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.md }}>
        <SectionLabel n={2} text="How did it go?" />
        <TemperatureButtons value={temperature} onChange={setTemperature} />
      </Card>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.md }}>
        <SectionLabel n={3} text="What were they interested in?" />
        <ProductChips selected={products} onChange={setProducts} />
      </Card>

      <Card style={{ padding: SPACE.lg, marginBottom: SPACE.md }}>
        <div style={{ ...TYPE.label, color: COLORS.inkSoft, marginBottom: SPACE.sm }}>Optional</div>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <VoiceNoteRecorder blob={voiceBlob} onChange={setVoiceBlob} />
          <GeoTagControl geo={geo} />
        </div>
      </Card>

      {error && <div style={{ ...TYPE.body, color: COLORS.correction, marginBottom: SPACE.sm }}>{error}</div>}
      {success && <div style={{ ...TYPE.body, color: COLORS.ledgerGreen, marginBottom: SPACE.sm }}>{success}</div>}

      <PrimaryButton onClick={handleSubmit} disabled={!canSubmit} style={{ width: "100%" }}>
        {submitting ? "Saving..." : "Log this visit"}
      </PrimaryButton>
    </div>
  );
}

function SectionLabel({ n, text }) {
  return (
    <div style={{ ...TYPE.label, color: COLORS.inkSoft, marginBottom: SPACE.sm }}>
      {n}. {text}
    </div>
  );
}

function GeoTagControl({ geo }) {
  if (geo.status === "attached") {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...TYPE.body, fontSize: "13px" }}>
        <span>📍 Location attached</span>
        <button onClick={geo.clear} style={{ background: "none", border: "none", color: COLORS.correction, cursor: "pointer", ...TYPE.body, fontSize: "12.5px" }}>Remove</button>
      </div>
    );
  }
  if (geo.status === "unsupported") return null;
  return (
    <button
      onClick={geo.attach}
      disabled={geo.status === "locating"}
      style={{ ...TYPE.body, fontSize: "13px", background: "none", border: `1.5px solid ${COLORS.border}`, borderRadius: "8px", padding: "10px", cursor: "pointer" }}
    >
      {geo.status === "locating" ? "Getting location..." : geo.status === "denied" ? "Location denied - tap to retry" : "📍 Attach my location"}
    </button>
  );
}
