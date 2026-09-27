const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4100";

function getToken() {
  return localStorage.getItem("ss_token");
}

async function request(path, { method = "GET", body, isMultipart = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isMultipart) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch { /* body wasn't JSON */ }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  API_BASE,
  login: (phone, password) => request("/auth/login", { method: "POST", body: { phone, password } }),
  listUsers: () => request("/auth/users"),
  createUser: (payload) => request("/auth/users", { method: "POST", body: payload }),
  updateUser: (id, payload) => request(`/auth/users/${id}`, { method: "PATCH", body: payload }),
  resetUserPassword: (id, password) => request(`/auth/users/${id}/reset-password`, { method: "POST", body: { password } }),
  setAvailable: (available) => request("/auth/users/me/available", { method: "PATCH", body: { available } }),

  searchContacts: (q) => request(`/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createContact: (payload) => request("/contacts", { method: "POST", body: payload }),

  getBoard: () => request("/pipeline/board"),
  createCard: (payload) => request("/pipeline", { method: "POST", body: payload }),
  moveCardStage: (id, stage, objection_reason) =>
    request(`/pipeline/${id}/stage`, { method: "PATCH", body: { stage, objection_reason } }),
  assignCard: (id, assigned_to) => request(`/pipeline/${id}/assign`, { method: "PATCH", body: { assigned_to } }),
  assignRoundRobin: (id, role) => request(`/pipeline/${id}/assign-round-robin`, { method: "POST", body: { role } }),

  submitFieldCapture: (formData) => request("/field-captures", { method: "POST", body: formData, isMultipart: true }),

  getInbox: (assignedToMe = false) => request(`/inbox${assignedToMe ? "?assigned_to_me=true" : ""}`),
  getUnreadCount: () => request("/inbox/unread-count"),
  markInboxRead: () => request("/inbox/mark-read", { method: "POST" }),

  getMyReminders: () => request("/reminders/mine"),
  createReminder: (payload) => request("/reminders", { method: "POST", body: payload }),
  snoozeReminder: (id, snoozed_until) => request(`/reminders/${id}/snooze`, { method: "PATCH", body: { snoozed_until } }),
  completeReminder: (id) => request(`/reminders/${id}/complete`, { method: "PATCH" }),
};
