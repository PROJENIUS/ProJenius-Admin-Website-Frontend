import { getAdminCsrfToken } from "./adminAuth";

const configuredApiBaseUrl = import.meta.env.VITE_ADMIN_API_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:5000" : ""))
  .replace(/\/+$/, "");
const CONTACT_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/api/admin` : "";

async function request(path, options = {}) {
  if (!CONTACT_ENDPOINT) {
    throw new Error("The admin API is not configured. Please contact the site administrator.");
  }
  const response = await fetch(`${CONTACT_ENDPOINT}${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The contact request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function makeQuery(filters = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value).trim());
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function listAdminEnquiries(filters) {
  return request(`/enquiries${makeQuery(filters)}`);
}

export function listAdminJobApplications(filters) {
  return request(`/job-applications${makeQuery(filters)}`);
}

export function getAdminDashboardStats() {
  return request("/dashboard/stats");
}

export function getAdminEnquiry(id) {
  return request(`/enquiries/${encodeURIComponent(id)}`);
}

export function getAdminJobApplication(id) {
  return request(`/job-applications/${encodeURIComponent(id)}`);
}

export async function updateAdminSubmissionStatus(kind, id, status) {
  const endpoint = kind === "career" ? "job-applications" : "enquiries";
  const csrfToken = await getAdminCsrfToken();
  return request(`/${endpoint}/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ status }),
  });
}

export async function downloadAdminSubmissionFile(kind, id, fileKind) {
  if (!CONTACT_ENDPOINT) {
    throw new Error("The admin API is not configured. Please contact the site administrator.");
  }
  const endpoint = kind === "career" ? "job-applications" : "enquiries";
  const suffix = fileKind === "receipt"
    ? "receipt"
    : kind === "career"
      ? "resume"
      : "attachment";
  const response = await fetch(
    `${CONTACT_ENDPOINT}/${endpoint}/${encodeURIComponent(id)}/${suffix}`,
    { credentials: "include", cache: "no-store" }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "The requested file could not be downloaded.");
  }

  return response.blob();
}
