import { adminApiUrl, normalizeAdminApiBase } from "../utils/apiUrl.js";
import { getAdminCsrfToken } from "./adminAuth";

const API = normalizeAdminApiBase(import.meta.env.VITE_ADMIN_API_URL?.trim(), import.meta.env.DEV);

/* The public website, shown in the live preview frame. */
const DEFAULT_SITE_URL = "https://pro-jenius-official-website-fronten.vercel.app";
export const PUBLIC_SITE_ORIGIN = new URL(import.meta.env.VITE_PUBLIC_SITE_URL?.trim() || (import.meta.env.DEV ? "http://localhost:5173" : DEFAULT_SITE_URL)).origin;

async function request(path, { method = "GET", body } = {}) {
  if (!API) throw new Error("The admin API is not configured.");
  const headers = { Accept: "application/json" };
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = await getAdminCsrfToken();
  const response = await fetch(adminApiUrl(`/api/page-heroes/admin${path}`, API), {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The page hero request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const listPageHeroes = () => request("");
export const getPageHero = (key) => request(`/${encodeURIComponent(key)}`);
export const savePageHero = (key, payload) => request(`/${encodeURIComponent(key)}`, { method: "PUT", body: payload });
export const resetPageHero = (key, revision) => request(`/${encodeURIComponent(key)}`, { method: "DELETE", body: { revision } });

export function uploadPageHeroImage(key, field, file) {
  const form = new FormData();
  form.append("image", file);
  return request(`/${encodeURIComponent(key)}/image?field=${encodeURIComponent(field)}`, { method: "POST", body: form });
}

export const pageHeroMediaUrl = (mediaId) => adminApiUrl(`/api/page-heroes/admin/media/${encodeURIComponent(mediaId)}`, API);
export const heroPreviewUrl = (key) => `${PUBLIC_SITE_ORIGIN}/hero-preview/${encodeURIComponent(key)}`;
