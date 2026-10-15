const LEGACY_ADMIN_PERMISSIONS = [
  "dashboard:view",
  "enquiries:list",
  "enquiries:details",
  "enquiries:changeStatus",
  "enquiries:download",
  "careerApplications:list",
  "careerApplications:details",
  "careerApplications:changeStatus",
  "careerApplications:download",
];

export function isSuperAdmin(admin) {
  return admin?.role === "superadmin";
}

export function hasPermission(admin, permission) {
  if (isSuperAdmin(admin)) return true;
  if (Array.isArray(admin?.permissions)) return admin.permissions.includes(permission);
  return LEGACY_ADMIN_PERMISSIONS.includes(permission);
}

export function canAccessNavigationItem(admin, item) {
  if (item.superAdminOnly && !isSuperAdmin(admin)) return false;
  if (item.permission && !hasPermission(admin, item.permission)) return false;
  if (item.permissions && !item.permissions.some((permission) => hasPermission(admin, permission))) return false;
  return true;
}

export function getAdminRoleLabel(admin) {
  return isSuperAdmin(admin) ? "Super Admin" : "Admin";
}
