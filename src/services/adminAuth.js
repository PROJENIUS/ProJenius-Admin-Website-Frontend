
/* =========================================================
   PROJENIUS ADMIN — AUTHENTICATION SERVICE
   Responsibility: Communicate securely with the backend
========================================================= */

// SECTION: API CONFIGURATION
const configuredApiBaseUrl = import.meta.env.VITE_ADMIN_API_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:5000" : ""))
  .replace(/\/+$/, "");
const AUTH_ENDPOINT = API_BASE_URL ? `${API_BASE_URL}/api/admin/auth` : "";

function requireAuthEndpoint() {
  if (!AUTH_ENDPOINT) {
    throw new Error("The admin API is not configured. Please contact the site administrator.");
  }
}

// SECTION: CSRF TOKEN STORAGE
// Keep the token in memory only. Never store it in localStorage.
let csrfToken = null;

// SECTION: API RESPONSE HANDLING
async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.error || "The request could not be completed."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

// SECTION: SHARED REQUEST HEADERS
function getRequestHeaders(includeCsrf = false) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (includeCsrf && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}

// SECTION: GET A CSRF TOKEN
export async function getAdminCsrfToken() {
  requireAuthEndpoint();
  const response = await fetch(`${AUTH_ENDPOINT}/csrf`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await parseResponse(response);

  if (
    typeof data.csrfToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.csrfToken)
  ) {
    throw new Error("Unable to initialize session security.");
  }

  csrfToken = data.csrfToken;

  return data.csrfToken;
}

// SECTION: ADMIN LOGIN
export async function loginAdmin(email, password, rememberMe = false) {
  requireAuthEndpoint();
  if (!csrfToken) {
    await getAdminCsrfToken();
  }

  const response = await fetch(`${AUTH_ENDPOINT}/login`, {
    method: "POST",
    credentials: "include",
    headers: getRequestHeaders(true),
    cache: "no-store",
    body: JSON.stringify({
      email,
      password,
      rememberMe,
    }),
  });

  const data = await parseResponse(response);

  // The backend rotates the session and issues a new CSRF token.
  if (
    typeof data.csrfToken !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.csrfToken)
  ) {
    csrfToken = null;
    throw new Error("Unable to initialize authenticated session.");
  }

  csrfToken = data.csrfToken;

  return data;
}

// SECTION: RESTORE CURRENT ADMIN SESSION
export async function getAdminSession() {
  requireAuthEndpoint();
  const response = await fetch(`${AUTH_ENDPOINT}/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return parseResponse(response);
}

// SECTION: ADMIN LOGOUT
export async function logoutAdmin() {
  requireAuthEndpoint();
  if (!csrfToken) {
    await getAdminCsrfToken();
  }

  try {
    const response = await fetch(`${AUTH_ENDPOINT}/logout`, {
      method: "POST",
      credentials: "include",
      headers: getRequestHeaders(true),
      cache: "no-store",
      body: JSON.stringify({}),
    });

    return await parseResponse(response);
  } finally {
    // Remove the in-memory token regardless of the outcome.
    csrfToken = null;
  }
}

async function postAuth(path, body, authenticated = false) {
  requireAuthEndpoint();
  if (!csrfToken) await getAdminCsrfToken();
  const response = await fetch(`${AUTH_ENDPOINT}${path}`, {
    method: "POST",
    credentials: "include",
    headers: getRequestHeaders(true),
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const data = await parseResponse(response);
  if (authenticated && data.csrfToken) csrfToken = data.csrfToken;
  return data;
}

export function inviteAdministrator(name, email, permissions) {
  return postAuth("/invitations", { name, email, ...(permissions ? { permissions } : {}) }, true);
}

export function acceptAdministratorInvitation(token, password) {
  return postAuth("/invitations/accept", { token, password });
}

export function requestAdminPasswordReset(email) {
  return postAuth("/password/forgot", { email });
}

export function resetAdminPassword(token, password) {
  return postAuth("/password/reset", { token, password });
}
