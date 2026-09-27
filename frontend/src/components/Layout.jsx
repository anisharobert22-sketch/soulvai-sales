import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { useViewportTier } from "../lib/useViewportTier.js";
import { COLORS, TYPE, SPACE, FONTS } from "../constants/theme.js";
import { api } from "../lib/api.js";
import { useEffect, useState } from "react";
import { disconnectSocket, getSocket } from "../lib/socket.js";

const NAV_ITEMS = [
  { to: "/capture", label: "Capture", icon: "📸" },
  { to: "/board", label: "Board", icon: "🗂" },
  { to: "/inbox", label: "Inbox", icon: "📥" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/team", label: "Team", icon: "👥" },
];

export default function Layout({ children }) {
  const { user, organization, logout, updateAvailable } = useAuth();
  const { isPhone } = useViewportTier();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    function refresh() {
      api.getUnreadCount().then((r) => setUnread(r.count)).catch(() => {});
    }
    refresh();
    const socket = getSocket();
    socket?.on("inbox:new", refresh);
    socket?.on("inbox:assigned", refresh);
    return () => {
      socket?.off("inbox:new", refresh);
      socket?.off("inbox:assigned", refresh);
    };
  }, []);

  function handleLogout() {
    disconnectSocket();
    logout();
    navigate("/login");
  }

  async function toggleAvailable() {
    const next = !user.available;
    await api.setAvailable(next);
    updateAvailable(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: isPhone ? "column" : "row", height: "100vh", background: COLORS.parchment }}>
      {!isPhone && (
        <div style={{ width: "220px", flexShrink: 0, borderRight: `1.5px solid ${COLORS.border}`, padding: SPACE.lg, display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: FONTS.display, fontWeight: 600, fontSize: "18px", color: COLORS.ledgerGreen, marginBottom: SPACE.xl }}>
            {organization?.display_name || "SoulvAI Sales"}
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: SPACE.xs, flex: 1 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} style={({ isActive }) => navStyle(isActive)}>
                <span>{item.icon}</span> {item.label}
                {item.to === "/inbox" && unread > 0 && <Badge count={unread} />}
              </NavLink>
            ))}
            {user?.role === "admin" && ADMIN_NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} style={({ isActive }) => navStyle(isActive)}>
                <span>{item.icon}</span> {item.label}
              </NavLink>
            ))}
          </nav>
          <UserFooter user={user} onToggleAvailable={toggleAvailable} onLogout={handleLogout} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: isPhone ? SPACE.md : SPACE.xl, paddingBottom: isPhone ? "80px" : SPACE.xl }}>
        {children}
      </div>

      {isPhone && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", background: COLORS.cardBg, borderTop: `1.5px solid ${COLORS.border}` }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => bottomNavStyle(isActive)}>
              <div style={{ fontSize: "20px", position: "relative" }}>
                {item.icon}
                {item.to === "/inbox" && unread > 0 && <Badge count={unread} corner />}
              </div>
              <div style={{ ...TYPE.label, fontSize: "10px", textTransform: "none", fontWeight: 500 }}>{item.label}</div>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ count, corner }) {
  return (
    <span
      style={{
        ...(corner
          ? { position: "absolute", top: "-4px", right: "-8px" }
          : { marginLeft: "auto" }),
        background: COLORS.correction,
        color: COLORS.textOnAccent,
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 700,
        minWidth: "16px",
        height: "16px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function UserFooter({ user, onToggleAvailable, onLogout }) {
  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: SPACE.md, marginTop: SPACE.md }}>
      <div style={{ ...TYPE.body, fontWeight: 600, fontSize: "13px" }}>{user?.name}</div>
      <div style={{ ...TYPE.body, fontSize: "11.5px", color: COLORS.inkSoft, textTransform: "capitalize", marginBottom: SPACE.sm }}>{user?.role}</div>
      {user?.role === "cce" && (
        <label style={{ display: "flex", alignItems: "center", gap: SPACE.xs, ...TYPE.body, fontSize: "12.5px", cursor: "pointer", marginBottom: SPACE.sm }}>
          <input type="checkbox" checked={user.available} onChange={onToggleAvailable} />
          Available for round robin
        </label>
      )}
      <button onClick={onLogout} style={{ ...TYPE.body, fontSize: "12.5px", background: "none", border: "none", color: COLORS.brass, cursor: "pointer", padding: 0 }}>
        Log out
      </button>
    </div>
  );
}

function navStyle(isActive) {
  return {
    display: "flex",
    alignItems: "center",
    gap: SPACE.sm,
    padding: "10px 12px",
    borderRadius: "8px",
    textDecoration: "none",
    color: isActive ? COLORS.textOnAccent : COLORS.ink,
    background: isActive ? COLORS.ledgerGreen : "transparent",
    fontFamily: FONTS.body,
    fontSize: "14px",
    fontWeight: 600,
  };
}

function bottomNavStyle(isActive) {
  return {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "8px 0",
    textDecoration: "none",
    color: isActive ? COLORS.ledgerGreen : COLORS.inkSoft,
  };
}
