const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
export const DEFAULT_ADMIN_API_BASE_URL = "https://projenius-official-website-backend.onrender.com";

export function normalizeAdminApiBase(configuredBase, development = false) {
  const candidate = String(configuredBase || "").trim() || (development ? "http://localhost:5000" : DEFAULT_ADMIN_API_BASE_URL);
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
