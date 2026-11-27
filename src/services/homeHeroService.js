import { adminApiUrl, normalizeAdminApiBase } from "../utils/apiUrl.js";
import { getAdminCsrfToken } from "./adminAuth";

const API = normalizeAdminApiBase(import.meta.env.VITE_ADMIN_API_URL?.trim(), import.meta.env.DEV);

async function request(path, { method = "GET", body } = {}) {
  if (!API) throw new Error("The admin API is not configured.");
  const headers = { Accept: "application/json" };
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = await getAdminCsrfToken();
  const response = await fetch(adminApiUrl(`/api/home/admin${path}`, API), {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The Home Hero request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const getHomeHero = () => request("/hero");
export const saveHomeHero = (payload) => request("/hero", { method: "PUT", body: payload });

export function uploadHomeHeroImage(file) {
  const form = new FormData();
  form.append("image", file);
  return request("/hero/image", { method: "POST", body: form });
}

/** Saved upload, previewed through the admin-only route (works for hidden slides too). */
export const homeHeroMediaUrl = (mediaId) => adminApiUrl(`/api/home/admin/hero/media/${encodeURIComponent(mediaId)}`, API);

/** The five photos shipped with the website (copies in admin /public). */
export const builtinHeroImageUrl = (key) => `/home-hero/${encodeURIComponent(key)}.webp`;
