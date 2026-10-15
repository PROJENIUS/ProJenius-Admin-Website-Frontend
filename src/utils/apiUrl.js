const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeAdminApiBase(configuredBase, development = false) {
  const candidate = String(configuredBase || "").trim() || (development ? "http://localhost:5000" : "");
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
