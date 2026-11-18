import { useCallback, useRef, useState } from "react";
import { hasPermission, isSuperAdmin } from "../../../utils/adminAccess";
import AdminManagement from "../../../Pages/AdminManagement";
import AdminHeader from "../AdminHeader/AdminHeader";
import AdminPageContent from "../AdminPageContent/AdminPageContent";
import AdminSidebar from "../AdminSidebar/AdminSidebar";
import CourseManagement from "../CourseManagement/CourseManagement";
import CareerGuidanceManagement from "../CareerGuidance/CareerGuidanceManagement";
import Dashboard from "../Dashboard/Dashboard";
import EnquiriesManagement from "../Enquiries/EnquiriesManagement";
import LegalManagement from "../LegalManagement/LegalManagement";
import NewsletterManagement from "../Publishing/NewsletterManagement";
import PublishingManagement from "../Publishing/PublishingManagement";

const COURSE_PERMISSIONS = [
  "courses:list",
  "courses:enrollments:view",
  "courses:enrollments:details",
  "courses:notifications:view",
  "courses:notifications:retry",
  "courses:payments:view",
  "courses:analytics:view",
  "courses:refunds:view",
];

const GUIDANCE_PERMISSIONS = ["guidance:view", "guidance:manage", "guidance:settings", "guidance:refund"];

const PUBLISHING_PERMISSIONS = [
  "publishing:articles:list",
  "publishing:articles:view",
  "publishing:articles:create",
  "publishing:articles:edit",
  "publishing:articles:publish",
  "publishing:articles:schedule",
  "publishing:articles:archive",
  "publishing:articles:uploadImage",
  "publishing:campaigns:create",
];

const NEWSLETTER_PERMISSIONS = [
  "newsletter:subscribers:view",
  "newsletter:subscribers:retry",
  "newsletter:campaigns:view",
  "newsletter:campaigns:retry",
  "newsletter:campaigns:cancel",
];

const pageInformation = {
  "/dashboard": {
    title: "Welcome to ProJenius Admin",
    description: "Your central workspace for contact activity and available operational summaries.",
  },
  "/enquiries": {
    title: "Enquiries Management",
    description: "Review and manage enquiries received by ProJenius.",
  },
  "/courses": {
    title: "Course Management",
    description: "Manage course content, publication, enrolments and payment records.",
  },
  "/publishing": {
    title: "News & Insights",
    description: "Create and publish all company editorial content.",
  },
  "/newsletter": {
    title: "Newsletter",
    description: "Review subscribers, campaigns and delivery outcomes.",
  },
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
  "/career-guidance": {
    title: "Career Guidance",
    description: "1:1 guidance calls, fee and Meet link",
  },
  "/administrators": {
    title: "Users & Activity",
    description: "Create Admin and Staff accounts and see every sign-in and change.",
  },
  "/legal/terms": {
    title: "Terms & Conditions",
    description: "Edit the public Terms document.",
  },
  "/legal/privacy-policy": {
    title: "Privacy Policy",
    description: "Edit the public Privacy Policy document.",
  },
  "/legal/course-terms": {
    title: "Course Terms",
    description: "Edit the terms and version used by course checkout.",
  },
};

function hasAnyPermission(admin, permissions) {
  return permissions.some((permission) => hasPermission(admin, permission));
}

export default function AdminWorkspace({ admin, onLogout }) {
  const [activePath, setActivePath] = useState("/dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const legalDirtyRef = useRef(false);
  const registerLegalDirty = useCallback((dirty) => {
    legalDirtyRef.current = dirty;
  }, []);
  const currentPage = pageInformation[activePath] || pageInformation["/dashboard"];

  function handleNavigation(path) {
    const shouldConfirmLeave = activePath.startsWith("/legal/")
      && legalDirtyRef.current;
    if (
      shouldConfirmLeave
      && !window.confirm("You have unsaved legal content changes. Leave this editor and discard them?")
    ) {
      return;
    }

    if (path.startsWith("/legal/") && !hasPermission(admin, "legal:documents:view")) return;
    if (path === "/administrators" && !isSuperAdmin(admin)) return;
    if (
      path === "/enquiries"
      && !hasPermission(admin, "enquiries:list")
      && !hasPermission(admin, "careerApplications:list")
    ) {
      return;
    }
    if (path === "/dashboard" && !hasPermission(admin, "dashboard:view")) return;
    if (path === "/courses" && !hasAnyPermission(admin, COURSE_PERMISSIONS)) return;
    if (path === "/career-guidance" && !hasAnyPermission(admin, GUIDANCE_PERMISSIONS)) return;
    if (path === "/publishing" && !hasAnyPermission(admin, PUBLISHING_PERMISSIONS)) return;
    if (path === "/newsletter" && !hasAnyPermission(admin, NEWSLETTER_PERMISSIONS)) return;

    setActivePath(path);
    setMobileOpen(false);
  }

  function renderActivePage() {
    if (activePath === "/dashboard") {
      return (
        <Dashboard
          title={currentPage.title}
          description={currentPage.description}
          admin={admin}
          onNavigate={handleNavigation}
        />
      );
    }

    if (activePath === "/enquiries") {
      return (
        <EnquiriesManagement
          admin={admin}
          title={currentPage.title}
          description={currentPage.description}
        />
      );
    }

    if (activePath === "/administrators" && isSuperAdmin(admin)) {
      return <AdminManagement />;
    }

    if (activePath === "/career-guidance" && hasAnyPermission(admin, GUIDANCE_PERMISSIONS)) {
      return <CareerGuidanceManagement admin={admin} />;
    }

    if (activePath === "/courses" && hasAnyPermission(admin, COURSE_PERMISSIONS)) {
      return <CourseManagement admin={admin} onNavigate={handleNavigation} />;
    }

    if (
      activePath === "/publishing"
      && hasAnyPermission(admin, PUBLISHING_PERMISSIONS)
    ) {
      return <PublishingManagement admin={admin} />;
    }

    if (
      activePath === "/newsletter"
      && hasAnyPermission(admin, NEWSLETTER_PERMISSIONS)
    ) {
      return <NewsletterManagement admin={admin} />;
    }

    if (
      activePath.startsWith("/legal/")
      && hasPermission(admin, "legal:documents:view")
    ) {
      return (
        <LegalManagement
          activePath={activePath}
          canEdit={hasPermission(admin, "legal:documents:edit")}
          onDirtyChange={registerLegalDirty}
        />
      );
    }

    return (
      <AdminPageContent
        activePath={activePath}
        title={currentPage.title}
        description={currentPage.description}
      />
    );
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

      <div className={[
        "pa-admin-workspace",
        collapsed ? "pa-admin-workspace--collapsed" : "",
      ].filter(Boolean).join(" ")}>
        <AdminHeader
          activePath={activePath}
          admin={admin}
          onMenuClick={() => setMobileOpen(true)}
          onLogout={onLogout}
        />

        <main className="pa-admin-main">{renderActivePage()}</main>
      </div>
    </>
  );
}
