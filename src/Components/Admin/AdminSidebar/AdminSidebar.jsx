/* =========================================================
   PROJENIUS ADMIN — SIDEBAR
========================================================= */

import { canAccessNavigationItem } from "../../../utils/adminAccess";

const navigationGroups = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", icon: "▦", path: "/dashboard", permission: "dashboard:view" },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Enquiries", icon: "✉", path: "/enquiries", permissions: ["enquiries:list", "careerApplications:list"] },
      { label: "Courses", icon: "▤", path: "/courses", permissions: ["courses:list", "courses:enrollments:view", "courses:enrollments:details", "courses:notifications:view", "courses:notifications:retry", "courses:payments:view", "courses:analytics:view", "courses:refunds:view"] },
      { label: "Career Guidance", icon: "☎", path: "/career-guidance", permissions: ["guidance:view", "guidance:manage", "guidance:settings", "guidance:refund"] },
      { label: "News & Insights", icon: "▧", path: "/publishing", permissions: ["publishing:articles:list", "publishing:articles:view", "publishing:articles:create", "publishing:articles:edit", "publishing:articles:publish", "publishing:articles:schedule", "publishing:articles:archive", "publishing:articles:uploadImage", "publishing:campaigns:create"] },
      { label: "Newsletter", icon: "✉", path: "/newsletter", permissions: ["newsletter:subscribers:view", "newsletter:subscribers:retry", "newsletter:campaigns:view", "newsletter:campaigns:retry", "newsletter:campaigns:cancel"] },
    ],
  },
  {
    title: "WEBSITE",
    items: [
      { label: "Website Content · unavailable", icon: "◫", path: "/content" },
      { label: "Media Library · unavailable", icon: "▧", path: "/media" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Users & Activity", icon: "⚙", path: "/administrators", superAdminOnly: true },
    ],
  },
  {
    title: "LEGAL PAGES",
    items: [
      { label: "Terms & Conditions", icon: "§", path: "/legal/terms", permission: "legal:documents:view" },
      { label: "Privacy Policy", icon: "◇", path: "/legal/privacy-policy", permission: "legal:documents:view" },
      { label: "Course Terms", icon: "▤", path: "/legal/course-terms", permission: "legal:documents:view" },
    ],
  },
];

export default function AdminSidebar({
  activePath,
  admin,
  collapsed,
  mobileOpen,
  onNavigate,
  onClose,
  onToggleCollapse,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="pa-sidebar__overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "pa-sidebar",
          collapsed ? "pa-sidebar--collapsed" : "",
          mobileOpen ? "pa-sidebar--mobile-open" : "",
        ].filter(Boolean).join(" ")}
        aria-label="Admin navigation"
      >
        <div className="pa-sidebar__brand">
          <img className="pa-sidebar__brand-mark" src="/ProJenius_Logo.svg" alt="ProJenius Innovation Technology logo" />

          {!collapsed && (
            <div className="pa-sidebar__brand-copy">
              <span className="pa-sidebar__brand-name">ProJenius Innovation Technology</span>
              <span className="pa-sidebar__brand-caption">PROJENIUS ADMIN</span>
            </div>
          )}

          <button
            type="button"
            className="pa-sidebar__mobile-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <nav className="pa-sidebar__navigation">
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) => canAccessNavigationItem(admin, item));
            if (visibleItems.length === 0) return null;

            return (
            <section className="pa-sidebar__group" key={group.title}>
              {!collapsed && (
                <h2 className="pa-sidebar__group-title">{group.title}</h2>
              )}

              <ul className="pa-sidebar__list">
                {visibleItems.map((item) => {
                  const active = activePath === item.path;

                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        className={[
                          "pa-sidebar__nav-item",
                          active ? "pa-sidebar__nav-item--active" : "",
                        ].filter(Boolean).join(" ")}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        onClick={() => onNavigate(item.path)}
                      >
                        <span className="pa-sidebar__nav-icon" aria-hidden="true">
                          {item.icon}
                        </span>

                        {!collapsed && (
                          <span className="pa-sidebar__nav-label">
                            {item.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
            );
          })}
        </nav>

        <div className="pa-sidebar__footer">
          {!collapsed && (
            <div className="pa-sidebar__footer-copy">
              <strong>ProJenius Admin</strong>
              <span>Management workspace</span>
            </div>
          )}

          <button
            type="button"
            className="pa-sidebar__collapse-button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
