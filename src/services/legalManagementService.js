import { adminApiUrl, normalizeAdminApiBase } from "../utils/apiUrl.js";
import { getAdminCsrfToken } from "./adminAuth";

const configuredApiBaseUrl = import.meta.env.VITE_ADMIN_API_URL?.trim();
const API_BASE_URL = normalizeAdminApiBase(
  configuredApiBaseUrl,
  import.meta.env.DEV,
);

async function request(key, { method = "GET", body } = {}) {
  if (!API_BASE_URL) {
    throw new Error("The admin API is not configured.");
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    headers["X-CSRF-Token"] = await getAdminCsrfToken();
  }

  const response = await fetch(
    adminApiUrl(`/api/legal/admin/${encodeURIComponent(key)}`, API_BASE_URL),
    {
      method,
      credentials: "include",
      cache: "no-store",
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "The legal document request could not be completed.",
    );
  }

  return data;
}

export function getLegalDocument(key) {
  return request(key);
}

export function saveLegalDocument(key, document) {
  return request(key, { method: "PUT", body: document });
}
