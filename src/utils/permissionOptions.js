export const DEFAULT_REGULAR_ADMIN_PERMISSIONS = Object.freeze([
  "dashboard:view",
  "enquiries:list",
  "enquiries:details",
  "enquiries:changeStatus",
  "enquiries:download",
  "careerApplications:list",
  "careerApplications:details",
  "careerApplications:changeStatus",
  "careerApplications:download",
]);

const unavailableActions = (actions) => actions.map((label) => ({ label, available: false }));

export const PERMISSION_MODULES = Object.freeze([
  {
    label: "Dashboard",
    status: "available",
    actions: [{ label: "View totals", permission: "dashboard:view" }],
  },
  {
    label: "Enquiries",
    status: "available",
    actions: [
      { label: "List and search", permission: "enquiries:list" },
      { label: "View details", permission: "enquiries:details" },
      { label: "Change status", permission: "enquiries:changeStatus" },
      { label: "Download receipt and attachment", permission: "enquiries:download" },
    ],
  },
  {
    label: "Career Applications",
    status: "available",
    actions: [
      { label: "List and search", permission: "careerApplications:list" },
      { label: "View details", permission: "careerApplications:details" },
      { label: "Change status", permission: "careerApplications:changeStatus" },
      { label: "Download receipt and resume", permission: "careerApplications:download" },
    ],
  },
  {
    label: "Administrator Management",
    status: "superadmin-only",
    actions: [{ label: "Manage administrator accounts and invitations", available: false }],
  },
  {
    label: "Career Guidance",
    status: "available",
    actions: [
      { label: "View bookings", permission: "guidance:view" },
      { label: "Mark done / cancel / retry emails", permission: "guidance:manage" },
      { label: "Change fee and Meet link", permission: "guidance:settings" },
      { label: "Refund bookings", permission: "guidance:refund" },
    ],
  },
  {
    label: "Courses",
    status: "available",
    actions: [
      { label: "List and search courses", permission: "courses:list" },
      { label: "View course details", permission: "courses:view" },
      { label: "Create course drafts", permission: "courses:create" },
      { label: "Edit courses", permission: "courses:edit" },
      { label: "Upload course image", permission: "courses:uploadImage" },
      { label: "Schedule publication", permission: "courses:schedule" },
      { label: "Publish courses", permission: "courses:publish" },
      { label: "Unpublish courses", permission: "courses:unpublish" },
      { label: "Archive courses", permission: "courses:archive" },
      { label: "View enrolments", permission: "courses:enrollments:view" },
      { label: "View registration details", permission: "courses:enrollments:details" },
      { label: "Retry decision notifications", permission: "courses:notifications:retry" },
      { label: "View notification queue", permission: "courses:notifications:view" },
      { label: "View payment records", permission: "courses:payments:view" },
      { label: "View course analytics", permission: "courses:analytics:view" },
      { label: "Export enrolment reports", permission: "courses:reports:export" },
      { label: "View provider refund records", permission: "courses:refunds:view" },
    ],
  },
  {
    label: "Registrations",
    status: "unavailable",
    actions: unavailableActions(["List", "View details", "Create", "Edit", "Change status", "Delete"]),
  },
  { label: "Home Hero", status: "available", actions: [
    { label: "View Home Hero slides", permission: "home:hero:view" }, { label: "Edit and publish Home Hero slides", permission: "home:hero:edit" },
  ] },
  { label: "Job Openings", status: "available", actions: [
    { label: "View job openings", permission: "careers:openings:view" }, { label: "Create, edit, publish and close job openings", permission: "careers:openings:edit" },
  ] },
  { label: "Page Heroes", status: "available", actions: [
    { label: "View page heroes", permission: "pages:heroes:view" }, { label: "Edit and publish page heroes", permission: "pages:heroes:edit" },
  ] },
  { label: "News & Insights", status: "available", actions: [
    { label: "List articles", permission: "publishing:articles:list" }, { label: "View article details and previews", permission: "publishing:articles:view" }, { label: "Create articles", permission: "publishing:articles:create" }, { label: "Edit articles", permission: "publishing:articles:edit" }, { label: "Publish and schedule", permission: "publishing:articles:publish" }, { label: "Upload images", permission: "publishing:articles:uploadImage" }, { label: "Create announcement campaigns", permission: "publishing:campaigns:create" },
  ] },
  { label: "Newsletter", status: "available", actions: [
    { label: "View subscribers", permission: "newsletter:subscribers:view" }, { label: "Retry failed welcome emails", permission: "newsletter:subscribers:retry" }, { label: "View campaigns and deliveries", permission: "newsletter:campaigns:view" }, { label: "Retry failed campaigns", permission: "newsletter:campaigns:retry" }, { label: "Cancel queued campaigns", permission: "newsletter:campaigns:cancel" },
  ] },
  {
    label: "Media Library",
    status: "unavailable",
    actions: unavailableActions(["List", "Upload", "Edit", "Download", "Delete"]),
  },
]);
