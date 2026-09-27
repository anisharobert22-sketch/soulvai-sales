import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api.js";
import { getSocket } from "../lib/socket.js";
import { COLORS, TYPE, SPACE, RADIUS } from "../constants/theme.js";
import Card from "../components/ui/Card.jsx";
import { SecondaryButton } from "../components/ui/Button.jsx";

const KIND_ICONS = {
  field_capture: "📸",
  card_moved: "➡️",
  reminder_due: "⏰",
  assignment: "🎯",
  closed_won: "🎉",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function InboxPage() {
  const [tab, setTab] = useState("feed"); // feed | mine | reminders
  const [items, setItems] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState("");

  const refreshFeed = useCallback(() => {
    api.getInbox(tab === "mine").then(setItems).catch((e) => setError(e.message));
  }, [tab]);

  const refreshReminders = useCallback(() => {
    api.getMyReminders().then(setReminders).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (tab === "reminders") refreshReminders();
    else refreshFeed();
  }, [tab, refreshFeed, refreshReminders]);

  useEffect(() => {
    api.markInboxRead().catch(() => {});
    const socket = getSocket();
    const onNew = () => (tab === "reminders" ? refreshReminders() : refreshFeed());
    socket?.on("inbox:new", onNew);
    socket?.on("inbox:assigned", onNew);
    socket?.on("reminder:new", refreshReminders);
    return () => {
      socket?.off("inbox:new", onNew);
      socket?.off("inbox:assigned", onNew);
      socket?.off("reminder:new", refreshReminders);
    };
  }, [tab, refreshFeed, refreshReminders]);

  async function snooze(id, hours) {
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await api.snoozeReminder(id, until);
    refreshReminders();
  }

  async function complete(id) {
    await api.completeReminder(id);
    refreshReminders();
  }

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto" }}>
      <h1 style={{ ...TYPE.title, marginBottom: SPACE.md }}>Inbox</h1>

      <div style={{ display: "flex", gap: SPACE.xs, marginBottom: SPACE.md }}>
        {[["feed", "All"], ["mine", "Assigned to me"], ["reminders", "Reminders"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              ...TYPE.body, fontSize: "13px", fontWeight: 600, padding: "8px 14px", borderRadius: "999px",
              border: `1.5px solid ${tab === key ? COLORS.ledgerGreen : COLORS.border}`,
              background: tab === key ? COLORS.ledgerGreen : "transparent",
              color: tab === key ? COLORS.textOnAccent : COLORS.ink, cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div style={{ ...TYPE.body, color: COLORS.correction, marginBottom: SPACE.sm }}>{error}</div>}

      {tab === "reminders" ? (
        reminders.length === 0 ? (
          <EmptyState text="No reminders due." />
        ) : (
          reminders.map((r) => (
            <Card key={r.id} style={{ padding: SPACE.md, marginBottom: SPACE.sm }}>
              <div style={{ ...TYPE.body, fontWeight: 600, marginBottom: "2px" }}>{r.note || "Follow up"}</div>
              <div style={{ ...TYPE.body, fontSize: "12px", color: COLORS.inkSoft, marginBottom: SPACE.sm }}>
                Due {new Date(r.due_at).toLocaleString("en-IN")}
              </div>
              <div style={{ display: "flex", gap: SPACE.xs }}>
                <SecondaryButton onClick={() => complete(r.id)} style={{ padding: "6px 12px", fontSize: "12.5px", minHeight: "auto" }}>Done</SecondaryButton>
                <SecondaryButton onClick={() => snooze(r.id, 1)} style={{ padding: "6px 12px", fontSize: "12.5px", minHeight: "auto" }}>Snooze 1h</SecondaryButton>
                <SecondaryButton onClick={() => snooze(r.id, 24)} style={{ padding: "6px 12px", fontSize: "12.5px", minHeight: "auto" }}>Snooze 1d</SecondaryButton>
              </div>
            </Card>
          ))
        )
      ) : items.length === 0 ? (
        <EmptyState text="Nothing here yet." />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={{ padding: SPACE.md, marginBottom: SPACE.sm, display: "flex", gap: SPACE.sm, alignItems: "flex-start" }}>
            <span style={{ fontSize: "18px" }}>{KIND_ICONS[item.kind] || "•"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ ...TYPE.body }}>{item.summary}</div>
              <div style={{ ...TYPE.body, fontSize: "11.5px", color: COLORS.inkSoft }}>{timeAgo(item.created_at)}</div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ ...TYPE.body, color: COLORS.inkSoft, textAlign: "center", padding: SPACE.xl, border: `1.5px dashed ${COLORS.border}`, borderRadius: RADIUS }}>
      {text}
    </div>
  );
}
