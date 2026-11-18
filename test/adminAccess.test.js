import assert from "node:assert/strict";
import test from "node:test";
import { canAccessNavigationItem, getAdminRoleLabel, hasPermission, isSuperAdmin } from "../src/utils/adminAccess.js";
import { DEFAULT_REGULAR_ADMIN_PERMISSIONS, PERMISSION_MODULES } from "../src/utils/permissionOptions.js";
import { editCourseBatches, fromLocalDateTime, serializeCourseBatches, toLocalDateTime } from "../src/utils/courseScheduleForm.js";

test("administrator role labels and administrator-management access are role-specific", () => {
  const superAdmin = { role: "superadmin" };
  const regularAdmin = { role: "admin" };

  assert.equal(isSuperAdmin(superAdmin), true);
  assert.equal(getAdminRoleLabel(superAdmin), "Super Admin");
  assert.equal(isSuperAdmin(regularAdmin), false);
  assert.equal(getAdminRoleLabel(regularAdmin), "Admin");
  assert.equal(hasPermission(superAdmin, "careerApplications:download"), true);
  assert.equal(hasPermission(regularAdmin, "enquiries:list"), true, "legacy accounts retain existing contact access");
  assert.equal(hasPermission({ role: "admin", permissions: ["enquiries:list"] }, "careerApplications:list"), false);
  assert.equal(canAccessNavigationItem(regularAdmin, { permission: "enquiries:list" }), true);
  assert.equal(canAccessNavigationItem({ role: "admin", permissions: ["careerApplications:list"] }, { permission: "dashboard:view" }), false);
  assert.equal(canAccessNavigationItem({ role: "admin", permissions: ["careerApplications:list"] }, { permissions: ["enquiries:list", "careerApplications:list"] }), true);
  assert.equal(canAccessNavigationItem(regularAdmin, { superAdminOnly: true }), false);
  assert.equal(canAccessNavigationItem(superAdmin, { superAdminOnly: true }), true);
});

test("permission selector exposes implemented publishing permissions and marks other modules unavailable", () => {
  const activeModules = PERMISSION_MODULES.filter((module) => module.status === "available");
  assert.deepEqual(activeModules.map((module) => module.label), ["Dashboard", "Enquiries", "Career Applications", "Career Guidance", "Courses", "News & Insights", "Newsletter"]);
  const activePermissions = activeModules.flatMap((module) => module.actions.map((action) => action.permission));
  for (const permission of DEFAULT_REGULAR_ADMIN_PERMISSIONS) assert.ok(activePermissions.includes(permission));
  const courseModule = PERMISSION_MODULES.find((module) => module.label === "Courses");
  assert.deepEqual(courseModule.actions.map((action) => action.permission), [
    "courses:list", "courses:view", "courses:create", "courses:edit", "courses:uploadImage",
    "courses:schedule", "courses:publish", "courses:unpublish", "courses:archive",
    "courses:enrollments:view", "courses:enrollments:details",
    "courses:notifications:retry", "courses:notifications:view", "courses:payments:view", "courses:analytics:view",
    "courses:reports:export", "courses:refunds:view",
  ]);
  assert.equal(DEFAULT_REGULAR_ADMIN_PERMISSIONS.some((permission) => permission.startsWith("courses:")), false);
  const publishing = PERMISSION_MODULES.find((module) => module.label === "News & Insights");
  assert.ok(publishing.actions.some((action) => action.permission === "publishing:articles:publish"));
  const newsletter = PERMISSION_MODULES.find((module) => module.label === "Newsletter");
  assert.ok(newsletter.actions.some((action) => action.permission === "newsletter:campaigns:retry"));

  const administratorManagement = PERMISSION_MODULES.find((module) => module.label === "Administrator Management");
  assert.equal(administratorManagement.status, "superadmin-only");
  assert.equal(administratorManagement.actions.some((action) => action.permission), false);
  assert.ok(PERMISSION_MODULES.filter((module) => module.status === "unavailable").length >= 2);
  assert.ok(PERMISSION_MODULES.filter((module) => module.status === "unavailable").every((module) =>
    module.actions.every((action) => action.available === false && !action.permission)
  ));
});

test("structured batch editor converts local schedule times using the selected IANA timezone", () => {
  const utc = fromLocalDateTime("2026-10-20T10:30", "UTC");
  assert.equal(utc, "2026-10-20T10:30:00.000Z");
  const kolkata = fromLocalDateTime("2026-10-20T10:30", "Asia/Kolkata");
  assert.equal(kolkata, "2026-10-20T05:00:00.000Z");
  assert.equal(fromLocalDateTime("2026-03-08T01:30", "America/New_York"), "2026-03-08T06:30:00.000Z", "the time before the spring DST jump uses the prior offset");
  assert.equal(fromLocalDateTime("2026-03-08T03:30", "America/New_York"), "2026-03-08T07:30:00.000Z", "the time after the spring DST jump uses the new offset");
  assert.equal(fromLocalDateTime("2026-11-01T01:30", "America/New_York"), "2026-11-01T05:30:00.000Z", "ambiguous fall-back time resolves consistently to its earlier occurrence");
  assert.equal(toLocalDateTime(kolkata, "Asia/Kolkata"), "2026-10-20T10:30");
  assert.equal(toLocalDateTime("2026-10-20T10:30", "Asia/Kolkata"), "2026-10-20T10:30", "editing an already-local value does not shift it on rerender");
  assert.throws(() => fromLocalDateTime("2026-03-08T02:30", "America/New_York"), /daylight-saving gap/);
  const batches = editCourseBatches([{ _id: "batch-id", code: "oct", timezone: "Asia/Kolkata", startsAt: kolkata, sessions: [{ _id: "session-id", title: "Lecture", startsAt: kolkata }] }]);
  const payload = serializeCourseBatches(batches);
  assert.equal(payload[0]._id, "batch-id");
  assert.equal(payload[0].sessions[0]._id, "session-id");
  assert.equal(payload[0].sessions[0].startsAt, kolkata);
});
