import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "./api.js";
import { LEDGER_VARS } from "../constants/theme.js";

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = localStorage.getItem("ss_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// A vendor org's own branding overrides the accent color the moment its
// admin logs in - see theme.js's --color-orgAccent fallback chain. This
// is applied here, once, rather than by every page re-checking
// organization.primary_color.
function applyOrgBranding(organization) {
  const root = document.documentElement;
  Object.entries(LEDGER_VARS).forEach(([key, value]) => root.style.setProperty(key, value));
  if (organization?.primary_color) {
    root.style.setProperty("--color-orgAccent", organization.primary_color);
  } else {
    root.style.removeProperty("--color-orgAccent");
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);

  useEffect(() => {
    if (session?.organization) applyOrgBranding(session.organization);
  }, [session]);

  const login = useCallback(async (phone, password) => {
    const result = await api.login(phone, password);
    localStorage.setItem("ss_token", result.token);
    localStorage.setItem("ss_session", JSON.stringify(result));
    setSession(result);
    return result;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ss_token");
    localStorage.removeItem("ss_session");
    setSession(null);
  }, []);

  const updateAvailable = useCallback((available) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: { ...prev.user, available } };
      localStorage.setItem("ss_session", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user, organization: session?.organization, login, logout, updateAvailable }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
