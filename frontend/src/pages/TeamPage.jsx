import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { COLORS, TYPE, SPACE, RADIUS } from "../constants/theme.js";
import Card from "../components/ui/Card.jsx";
import { PrimaryButton, SecondaryButton, DangerButton } from "../components/ui/Button.jsx";

const ROLES = ["salesperson", "cce", "admin"];

export default function TeamPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // the user object being edited, or null
  const [resetting, setResetting] = useState(null); // the user object having its password reset

  const refresh = useCallback(() => {
    api.listUsers().then(setUsers).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  if (user?.role !== "admin") {
    return (
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <h1 style={{ ...TYPE.title, marginBottom: SPACE.md }}>Team</h1>
        <div style={{ ...TYPE.body, color: COLORS.inkSoft }}>Only an admin can manage the team.</div>
      </div>
    );
  }

  async function toggleActive(u) {
    await api.updateUser(u.id, { active: !u.active });
    refresh();
  }

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SPACE.md }}>
        <h1 style={{ ...TYPE.title }}>Team</h1>
        <PrimaryButton onClick={() => setShowAdd(true)} style={{ padding: "8px 16px", fontSize: "13px", minHeight: "auto" }}>
          + Add agent
        </PrimaryButton>
      </div>

      {error && <div style={{ ...TYPE.body, color: COLORS.correction, marginBottom: SPACE.sm }}>{error}</div>}

      <Card style={{ overflow: "hidden" }}>
        {users.length === 0 ? (
          <div style={{ ...TYPE.body, color: COLORS.inkSoft, textAlign: "center", padding: SPACE.xl }}>No agents yet.</div>
        ) : (
          users.map((u, i) => (
            <div
              key={u.id}
              data-testid={`agent-row-${u.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: SPACE.md,
                padding: SPACE.md,
                borderBottom: i < users.length - 1 ? `1px solid ${COLORS.border}` : "none",
                opacity: u.active ? 1 : 0.55,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...TYPE.body, fontWeight: 600 }}>
                  {u.name} {!u.active && <span style={{ ...TYPE.label, fontSize: "10px", color: COLORS.correction, marginLeft: SPACE.xs }}>Deactivated</span>}
                </div>
                <div style={{ ...TYPE.body, fontSize: "12.5px", color: COLORS.inkSoft }}>{u.phone}</div>
              </div>

              <div style={{ ...TYPE.label, fontSize: "11px", color: COLORS.ledgerGreen, textTransform: "capitalize", minWidth: "90px" }}>
                {u.role}
              </div>

              {u.role === "cce" && (
                <div style={{ ...TYPE.body, fontSize: "11.5px", color: u.available ? COLORS.ledgerGreen : COLORS.inkSoft, minWidth: "70px" }}>
                  {u.available ? "Available" : "Away"}
                </div>
              )}

              <div style={{ display: "flex", gap: SPACE.xs, flexShrink: 0 }}>
                <SecondaryButton onClick={() => setEditing(u)} style={{ padding: "6px 10px", fontSize: "12px", minHeight: "auto" }}>
                  Edit
                </SecondaryButton>
                <SecondaryButton onClick={() => setResetting(u)} style={{ padding: "6px 10px", fontSize: "12px", minHeight: "auto" }}>
                  Reset password
                </SecondaryButton>
                {u.id === user.id ? (
                  <span style={{ ...TYPE.body, fontSize: "11.5px", color: COLORS.inkSoft, alignSelf: "center" }}>You</span>
                ) : u.active ? (
                  <DangerButton onClick={() => toggleActive(u)} style={{ padding: "6px 10px", fontSize: "12px", minHeight: "auto" }}>
                    Deactivate
                  </DangerButton>
                ) : (
                  <PrimaryButton onClick={() => toggleActive(u)} style={{ padding: "6px 10px", fontSize: "12px", minHeight: "auto" }}>
                    Reactivate
                  </PrimaryButton>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      {showAdd && <AddAgentModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh(); }} />}
      {editing && (
        <EditAgentModal
          agent={editing}
          isSelf={editing.id === user.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {resetting && <ResetPasswordModal agent={resetting} onClose={() => setResetting(null)} onSaved={() => setResetting(null)} />}
    </div>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(42, 36, 28, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: SPACE.lg, zIndex: 50,
      }}
      onClick={onClose}
    >
      <Card style={{ padding: SPACE.lg, width: "100%", maxWidth: "380px" }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ ...TYPE.title, fontSize: "17px", marginBottom: SPACE.md }}>{title}</h2>
        {children}
      </Card>
    </div>
  );
}

const inputStyle = {
  ...TYPE.body,
  width: "100%",
  padding: "10px 12px",
  borderRadius: RADIUS,
  border: `1.5px solid ${COLORS.border}`,
  marginBottom: SPACE.md,
  boxSizing: "border-box",
};

const labelStyle = { ...TYPE.label, fontSize: "11px", marginBottom: "4px", display: "block" };

function AddAgentModal({ onClose, onSaved }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("salesperson");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createUser({ name, phone, password, role });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Add agent" onClose={onClose}>
      <form onSubmit={submit}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />

        <label style={labelStyle}>Phone (with country code)</label>
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" required />

        <label style={labelStyle}>Temporary password</label>
        <input style={inputStyle} type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        <label style={labelStyle}>Role</label>
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {error && <div style={{ ...TYPE.body, color: COLORS.correction, marginBottom: SPACE.md }}>{error}</div>}

        <div style={{ display: "flex", gap: SPACE.sm, justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Adding…" : "Add agent"}</PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

function EditAgentModal({ agent, isSelf, onClose, onSaved }) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Self-editing skips the role field entirely (see below), so there's
      // nothing to change there - only send what the form actually showed.
      await api.updateUser(agent.id, isSelf ? { name } : { name, role });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={`Edit ${agent.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <label style={labelStyle}>Name</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />

        {isSelf ? (
          <div style={{ ...TYPE.body, fontSize: "12.5px", color: COLORS.inkSoft, marginBottom: SPACE.md }}>
            You can't change your own role here - ask another admin.
          </div>
        ) : (
          <>
            <label style={labelStyle}>Role</label>
            <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </>
        )}

        {error && <div style={{ ...TYPE.body, color: COLORS.correction, marginBottom: SPACE.md }}>{error}</div>}

        <div style={{ display: "flex", gap: SPACE.sm, justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

function ResetPasswordModal({ agent, onClose, onSaved }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.resetUserPassword(agent.id, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <ModalShell title={`Password reset`} onClose={onSaved}>
        <div style={{ ...TYPE.body, marginBottom: SPACE.md }}>
          {agent.name}'s password has been changed. Share the new password with them directly - it won't be shown again here.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <PrimaryButton onClick={onSaved}>Done</PrimaryButton>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title={`Reset password for ${agent.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <label style={labelStyle}>New password</label>
        <input style={inputStyle} type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        {error && <div style={{ ...TYPE.body, color: COLORS.correction, marginBottom: SPACE.md }}>{error}</div>}

        <div style={{ display: "flex", gap: SPACE.sm, justifyContent: "flex-end" }}>
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Resetting…" : "Reset"}</PrimaryButton>
        </div>
      </form>
    </ModalShell>
  );
}
