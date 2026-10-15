import { getAdminCsrfToken } from "./adminAuth";

const configuredApiBaseUrl = import.meta.env.VITE_ADMIN_API_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:5000" : ""))
  .replace(/\/+$/, "");
const BASE = API_BASE_URL ? `${API_BASE_URL}/api/admin/admins` : "";

async function request(path, options = {}) {
  if (!BASE) throw new Error("The admin API is not configured.");
  const method = options.method || "GET";
  const headers = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = await getAdminCsrfToken();
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Administrator request failed.");
  return result;
}

function queryString(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value).trim());
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export const listAdministrators = (filters) => request(`/${queryString(filters)}`);
export const listPendingInvitations = (filters) => request(`/invitations${queryString(filters)}`);
export const listAdminAuditEvents = (filters) => request(`/audit-logs${queryString(filters)}`);
export const getAdministrator = (id) => request(`/${encodeURIComponent(id)}`);
export const resendAdminInvitation = (id) => request(`/invitations/${encodeURIComponent(id)}/resend`, { method: "POST" });
export const updateAdminPermissions = (id, permissions) => request(`/${encodeURIComponent(id)}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions }) });
export const setAdminActive = (id, isActive) => request(`/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) });
export const sendAdminPasswordReset = (id) => request(`/${encodeURIComponent(id)}/password-reset`, { method: "POST" });
export const removeAdmin = (id) => request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
