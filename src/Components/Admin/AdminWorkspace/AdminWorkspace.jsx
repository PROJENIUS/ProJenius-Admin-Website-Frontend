
/* =========================================================
   PROJENIUS ADMIN — ADMIN WORKSPACE
========================================================= */

import { useState } from "react";

import AdminSidebar from "../AdminSidebar/AdminSidebar";
import AdminHeader from "../AdminHeader/AdminHeader";
import Dashboard from "../Dashboard/Dashboard";
import AdminPageContent from "../AdminPageContent/AdminPageContent";
import EnquiriesManagement from "../Enquiries/EnquiriesManagement";
import AdminManagement from "../../../Pages/AdminManagement";
import CourseManagement from "../CourseManagement/CourseManagement";
import { hasPermission, isSuperAdmin } from "../../../utils/adminAccess";
import PublishingManagement from "../Publishing/PublishingManagement";
import NewsletterManagement from "../Publishing/NewsletterManagement";

const pageInformation = {
  "/dashboard": {
    title: "Welcome to ProJenius Admin",
    description:
      "Your central workspace for contact activity and available operational summaries.",
  },
  "/enquiries": {
    title: "Enquiries Management",
    description: "Review and manage enquiries received by ProJenius.",
  },
  "/courses": {
    title: "Course Management",
    description: "Manage course content, publication, enrolments and payment records.",
  },
  "/publishing": { title: "News & Insights", description: "Create and publish all company editorial content." },
  "/newsletter": { title: "Newsletter", description: "Review subscribers, campaigns and delivery outcomes." },
  "/registrations": {
    title: "Registration Management",
    description: "This module is unavailable until its backend features are implemented.",
  },
  "/content": {
    title: "Website Content",
    description: "This module is unavailable until its backend features are implemented.",
  },
  "/media": {
    title: "Media Library",
    description: "This module is unavailable until its backend features are implemented.",
  },
  "/administrators": {
    title: "Administrator Management",
    description: "Manage administrator access, invitations and security activity.",
  },
};

export default function AdminWorkspace({ admin, onLogout }) {
  const [activePath, setActivePath] = useState("/dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPage =
    pageInformation[activePath] || pageInformation["/dashboard"];

  function handleNavigation(path) {
    if (path === "/administrators" && !isSuperAdmin(admin)) return;
    if (path === "/enquiries" && !hasPermission(admin, "enquiries:list") && !hasPermission(admin, "careerApplications:list")) return;
    if (path === "/dashboard" && !hasPermission(admin, "dashboard:view")) return;
    if (path === "/courses" && !["courses:list", "courses:enrollments:view", "courses:enrollments:details", "courses:enrollments:approve", "courses:enrollments:reject", "courses:notifications:view", "courses:notifications:retry", "courses:payments:view", "courses:analytics:view", "courses:refunds:view"].some((permission) => hasPermission(admin, permission))) return;
    if (path === "/publishing" && !["publishing:articles:list", "publishing:articles:view", "publishing:articles:create", "publishing:articles:edit", "publishing:articles:publish", "publishing:articles:schedule", "publishing:articles:archive", "publishing:articles:uploadImage", "publishing:campaigns:create"].some((permission) => hasPermission(admin, permission))) return;
    if (path === "/newsletter" && !["newsletter:subscribers:view", "newsletter:campaigns:view", "newsletter:campaigns:retry", "newsletter:campaigns:cancel"].some((permission) => hasPermission(admin, permission))) return;
    setActivePath(path);
    setMobileOpen(false);
  }

  return (
    <>
      <AdminSidebar
        activePath={activePath}
        admin={admin}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={handleNavigation}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div
        className={[
          "pa-admin-workspace",
          collapsed ? "pa-admin-workspace--collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <AdminHeader
          activePath={activePath}
          admin={admin}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={onLogout}
        />

        <main className="pa-admin-main">
          {activePath === "/dashboard" ? (
            <Dashboard
              title={currentPage.title}
              description={currentPage.description}
            />
          ) : activePath === "/enquiries" ? (
            <EnquiriesManagement
              admin={admin}
              title={currentPage.title}
              description={currentPage.description}
            />
          ) : activePath === "/administrators" && isSuperAdmin(admin) ? (
            <AdminManagement />
          ) : activePath === "/courses" && ["courses:list", "courses:enrollments:view", "courses:enrollments:details", "courses:enrollments:approve", "courses:enrollments:reject", "courses:notifications:view", "courses:notifications:retry", "courses:payments:view", "courses:analytics:view", "courses:refunds:view"].some((permission) => hasPermission(admin, permission)) ? (
            <CourseManagement admin={admin} />
          ) : activePath === "/publishing" && ["publishing:articles:list", "publishing:articles:view", "publishing:articles:create", "publishing:articles:edit", "publishing:articles:publish", "publishing:articles:schedule", "publishing:articles:archive", "publishing:articles:uploadImage", "publishing:campaigns:create"].some((permission) => hasPermission(admin, permission)) ? (
            <PublishingManagement admin={admin} />
          ) : activePath === "/newsletter" && ["newsletter:subscribers:view", "newsletter:campaigns:view", "newsletter:campaigns:retry", "newsletter:campaigns:cancel"].some((permission) => hasPermission(admin, permission)) ? (
            <NewsletterManagement admin={admin} />
          ) : (
            <AdminPageContent
              activePath={activePath}
              title={currentPage.title}
              description={currentPage.description}
            />
          )}
        </main>
      </div>
    </>
  );
}
