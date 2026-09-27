import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { connectSocket } from "../lib/socket.js";
import { COLORS, TYPE, SPACE, FONTS, RADIUS, SHADOWS } from "../constants/theme.js";
import { PrimaryButton } from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(phone.trim(), password);
      connectSocket();
      navigate("/capture");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.parchment, padding: SPACE.lg }}>
      <Card style={{ padding: "32px 28px", width: "100%", maxWidth: "380px", boxShadow: SHADOWS.card }}>
        <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "24px", color: COLORS.ledgerGreen, marginBottom: "4px" }}>
          SoulvAI Sales
        </div>
        <div style={{ ...TYPE.body, color: COLORS.inkSoft, marginBottom: SPACE.xl }}>Field capture, pipeline, and inbox.</div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: SPACE.md }}>
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && <div style={{ ...TYPE.body, fontSize: "13px", color: COLORS.correction }}>{error}</div>}
          <PrimaryButton type="submit" disabled={loading} style={{ marginTop: SPACE.xs }}>
            {loading ? "Signing in..." : "Sign in"}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}

const inputStyle = {
  ...TYPE.body,
  padding: "12px 14px",
  borderRadius: RADIUS,
  border: `1.5px solid ${COLORS.border}`,
  background: COLORS.parchmentDeep,
};
