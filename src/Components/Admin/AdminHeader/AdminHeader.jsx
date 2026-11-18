/* =========================================================
   PROJENIUS ADMIN — HEADER
========================================================= */

import { useEffect } from "react";
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
    title: "Course Management",
    description: "Manage courses and learning programmes",
  },
  "/registrations": {
    title: "Registrations",
    description: "Manage student registrations",
  },
  "/publishing": {
    title: "News & Insights Management",
    description: "Manage articles and publication status",
  },
  "/newsletter": {
    title: "Newsletter Management",
    description: "Manage subscribers and campaigns",
  },
  "/career-guidance": {
    title: "Career Guidance",
    description: "1:1 guidance calls, fee and Meet link",
  },
  "/administrators": {
    title: "Users & Activity",
    description: "Admin and Staff accounts, sign-ins and changes",
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
  "/legal/terms": { title: "Terms & Conditions", description: "Edit the public Terms document" },
  "/legal/privacy-policy": { title: "Privacy Policy", description: "Edit the public Privacy Policy document" },
  "/legal/course-terms": { title: "Course Terms", description: "Manage course purchase terms and checkout version" },
};

export default function AdminHeader({
  activePath,
  admin,
  onMenuClick,
  onLogout,
}) {
  const page = pageTitles[activePath] || pageTitles["/dashboard"];

  useEffect(() => {
    document.title = `${page.title} | ProJenius Admin`;
  }, [page.title]);

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
          <img className="pa-admin-header__brand-logo" src="/ProJenius_Logo.svg" alt="ProJenius Innovation Technology logo" />
          <span className="pa-admin-header__brand-name">ProJenius Admin</span>
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
