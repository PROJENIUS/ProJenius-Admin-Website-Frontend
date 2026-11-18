import { getAdminCsrfToken } from "./adminAuth";
import { adminApiUrl, normalizeAdminApiBase } from "../utils/apiUrl.js";

const API_BASE_URL = normalizeAdminApiBase(import.meta.env.VITE_ADMIN_API_URL?.trim(), import.meta.env.DEV);
const BASE = API_BASE_URL ? adminApiUrl("/api/guidance/admin", API_BASE_URL) : "";

async function request(path, { csrf = false, raw = false, ...options } = {}) {
  if (!BASE) throw new Error("The admin API is not configured.");
  const headers = { Accept: raw ? "application/pdf" : "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (csrf) headers["X-CSRF-Token"] = await getAdminCsrfToken();
  const response = await fetch(`${BASE}${path}`, { credentials: "include", cache: "no-store", ...options, headers });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "The request could not be completed."); }
  return raw ? response.blob() : response.json();
}
const qs = (o) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== "" && v != null) p.set(k, v); }); return p.toString() ? `?${p}` : ""; };

export const getGuidanceSettings = () => request("/settings");
export const saveGuidanceSettings = (body) => request("/settings", { method: "PUT", csrf: true, body: JSON.stringify(body) });
export const listGuidanceBookings = (filters) => request(`/bookings${qs({ limit: 50, ...filters })}`);
export const updateGuidanceBooking = (id, action) => request(`/bookings/${encodeURIComponent(id)}/status`, { method: "PATCH", csrf: true, body: JSON.stringify({ action }) });
export const refundGuidanceBooking = (id, body) => request(`/bookings/${encodeURIComponent(id)}/refund`, { method: "POST", csrf: true, body: JSON.stringify(body) });
export const retryGuidanceEmails = (id) => request(`/bookings/${encodeURIComponent(id)}/emails/retry`, { method: "POST", csrf: true });
export async function downloadGuidanceReceipt(id, reference) {
  const blob = await request(`/bookings/${encodeURIComponent(id)}/receipt`, { raw: true });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: `ProJenius-Guidance-Receipt-${reference}.pdf` });
  document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
