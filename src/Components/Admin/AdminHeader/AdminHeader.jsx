/* =========================================================
   PROJENIUS ADMIN — HEADER
========================================================= */

import { getAdminRoleLabel } from "../../../utils/adminAccess";

const pageTitles = {
  "/dashboard": {
    title: "Dashboard",
    description: "Overview of your administrative workspace",
  },
  "/enquiries": {
    title: "Enquiries",
    description: "Manage incoming enquiries",
  },
  "/courses": {
    title: "Courses",
    description: "Manage courses and learning programmes",
  },
  "/registrations": {
    title: "Registrations",
    description: "Manage student registrations",
  },
  "/publishing": {
    title: "News & Insights",
    description: "Manage articles and publication status",
  },
  "/content": {
    title: "Website Content",
    description: "Manage website information",
  },
  "/media": {
    title: "Media Library",
    description: "Manage uploaded media",
  },
  "/settings": {
    title: "Settings",
    description: "Manage workspace preferences",
  },
};

export default function AdminHeader({
  activePath,
  admin,
  onMenuClick,
  onLogout,
}) {
  const page = pageTitles[activePath] || pageTitles["/dashboard"];

  return (
    <header className="pa-admin-header">
      <div className="pa-admin-header__left">
        <button
          type="button"
          className="pa-admin-header__menu"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div className="pa-admin-header__heading">
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </div>
      </div>

      <div className="pa-admin-header__right">
        <span className="pa-admin-header__status">
          <span className="pa-admin-header__status-dot" />
          Admin workspace
        </span>

        <div className="pa-admin-header__profile">
          <div className="pa-admin-header__avatar">A</div>

          <div className="pa-admin-header__profile-copy">
            <span className="pa-admin-header__profile-name">
              {admin?.name || admin?.email || "Administrator"}
            </span>
            <span className="pa-admin-header__profile-role">
              {getAdminRoleLabel(admin)}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="pa-admin-header__logout"
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
