import { adminApiUrl, normalizeAdminApiBase } from "../utils/apiUrl.js";
import { getAdminCsrfToken } from "./adminAuth";

const API = normalizeAdminApiBase(import.meta.env.VITE_ADMIN_API_URL?.trim(), import.meta.env.DEV);

async function request(path, { method = "GET", body } = {}) {
  if (!API) throw new Error("The admin API is not configured.");
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = await getAdminCsrfToken();
  const response = await fetch(adminApiUrl(`/api/careers/admin/openings${path}`, API), { method, credentials: "include", cache: "no-store", headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The job openings request could not be completed.");
  return data;
}

export const listOpenings = () => request("");
export const createOpening = (item) => request("", { method: "POST", body: item });
export const updateOpening = (id, item) => request(`/${encodeURIComponent(id)}`, { method: "PUT", body: item });
export const deleteOpening = (id) => request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
