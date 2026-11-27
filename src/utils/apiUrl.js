const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
export const DEFAULT_ADMIN_API_BASE_URL = "https://projenius-official-website-backend.onrender.com";

/* Production default is the admin site's own address: vercel.json forwards
   /api/* to the backend, so the login cookie is first-party and works in every
   browser (a cross-site cookie from onrender.com is blocked). Set
   VITE_ADMIN_API_URL to a full URL only to call a backend directly. */
const sameOrigin = () => (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "");

export function normalizeAdminApiBase(configuredBase, development = false) {
  const configured = String(configuredBase || "").trim();
  if (configured.toLowerCase() === "same-origin" || (!configured && !development)) return sameOrigin();
  const candidate = configured || "http://localhost:5000";
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (!development && LOCAL_HOSTS.has(url.hostname.toLowerCase())) return "";
    url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api$/i, "");
    url.search = "";
    url.hash = "";
    return url.origin + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return "";
  }
}

export function adminApiUrl(path, base = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? new URL(normalizedPath, `${base.replace(/\/+$/, "")}/`).href : normalizedPath;
}
