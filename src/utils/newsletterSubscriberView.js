const SUBSCRIPTION_TIMEZONE = "Asia/Kolkata";

export function subscriberSerialNumber(page, index, limit) {
  return (Math.max(1, page) - 1) * Math.max(1, limit) + index + 1;
}

export function formatSubscriptionDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: SUBSCRIPTION_TIMEZONE,
  }).format(date);
}

export function subscriberStatusLabel(status, legacyPending = false) {
  if (legacyPending && status === "pending") return "Legacy pending · review only";
  if (status === "active") return "Active";
  if (status === "unsubscribed") return "Unsubscribed";
  return "Unrecognized status";
}
