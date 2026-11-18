import { getAdminCsrfToken } from "./adminAuth";
import { adminApiUrl, normalizeAdminApiBase } from "../utils/apiUrl.js";

const configuredApiBaseUrl = import.meta.env.VITE_ADMIN_API_URL?.trim();
const API_BASE_URL = normalizeAdminApiBase(configuredApiBaseUrl, import.meta.env.DEV);
const BASE = API_BASE_URL ? adminApiUrl("/api/courses/admin", API_BASE_URL) : "";
export const courseAdminImageUrl = (courseId) => adminApiUrl(`/api/courses/admin/courses/${encodeURIComponent(courseId)}/image`, API_BASE_URL);

async function request(path, { csrf = false, ...options } = {}) {
  if (!API_BASE_URL) throw new Error("The admin API is not configured.");
  if (!BASE) throw new Error("The admin API is not configured.");
  const headers = { Accept: "application/json", ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (csrf) headers["X-CSRF-Token"] = await getAdminCsrfToken();
  const response = await fetch(`${BASE}${path}`, { credentials: "include", cache: "no-store", ...options, headers });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || "The course request could not be completed."); }
  return response.headers.get("content-type")?.includes("application/json") ? response.json() : response.blob();
}
const query = (values = {}) => { const params = new URLSearchParams(); for (const [key,value] of Object.entries(values)) if (value !== "" && value !== undefined && value !== null) params.set(key, value); return params.toString() ? `?${params}` : ""; };
export const listCourses = (filters) => request(`/courses${query({ limit: 20, ...filters })}`);
export const listCourseScheduleHistory = (id) => request(`/courses/${encodeURIComponent(id)}/schedule-history`);
export const saveCourse = (course, id) => request(id ? `/courses/${encodeURIComponent(id)}` : "/courses", { method: id ? "PATCH" : "POST", csrf: true, body: JSON.stringify(course) });
export const setCourseState = (id, action, scheduledAt) => request(`/courses/${encodeURIComponent(id)}/state`, { method: "PATCH", csrf: true, body: JSON.stringify({ action, scheduledAt }) });
export const uploadCourseImage = (id, form) => request(`/courses/${encodeURIComponent(id)}/image`, { method: "POST", csrf: true, body: form });
export const listEnrollments = (filters) => request(`/enrollments${query({ limit: 20, ...filters })}`);
export const getEnrollmentDetails = (id) => request(`/enrollments/${encodeURIComponent(id)}`);
export const retryPaymentNotifications = (id) => request(`/enrollments/${encodeURIComponent(id)}/payment-notifications/retry`, { method: "POST", csrf: true, body: JSON.stringify({}) });
export const listCourseNotifications = (filters) => request(`/notifications${query({ limit: 20, ...filters })}`);
export const retryCourseNotification = (id) => request(`/notifications/${encodeURIComponent(id)}/retry`, { method: "POST", csrf: true, body: JSON.stringify({}) });
export const listPayments = (filters) => request(`/payments${query({ limit: 20, ...filters })}`);
export const getCourseAnalytics = (filters) => request(`/analytics${query(filters)}`);
export const listRefunds = (filters) => request(`/refunds${query({ limit: 20, ...filters })}`);
export const downloadCourseReceipt = (id) => request(`/enrollments/${encodeURIComponent(id)}/receipt`);
export const exportCourseReport = () => request("/reports/enrollments.csv");
export const listCommonCourseFaqs = () => request("/common-faqs");
export const saveCommonCourseFaq = (faq, id) => request(id ? `/common-faqs/${encodeURIComponent(id)}` : "/common-faqs", { method: id ? "PATCH" : "POST", csrf: true, body: JSON.stringify(faq) });
export const deleteCommonCourseFaq = (id) => request(`/common-faqs/${encodeURIComponent(id)}`, { method: "DELETE", csrf: true });
export const getCoursePolicy = () => request("/policy");
export const saveCoursePolicyDraft = (policy) => request("/policy", { method: "PUT", csrf: true, body: JSON.stringify(policy) });
export const publishCoursePolicy = (policy) => request("/policy/publish", { method: "POST", csrf: true, body: JSON.stringify(policy) });
export const getAdminDashboard = () => request("/dashboard");
export const clearDashboardNotifications = () => request("/dashboard/notifications/clear", { method: "POST", csrf: true, body: JSON.stringify({}) });
