
/* =========================================================
   PROJENIUS ADMIN — PLACEHOLDER PAGE CONTENT
========================================================= */

import "./AdminPageContent.css";

export default function AdminPageContent({
  activePath,
  title,
  description,
}) {
  return (
    <div className="pa-admin-content">
      <section className="pa-admin-content__heading">
        <span className="pa-admin-content__eyebrow">
          ADMIN WORKSPACE
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className="pa-admin-content__panel">
        <div className="pa-admin-content__icon" aria-hidden="true">
          ◇
        </div>
        <h2>{title}</h2>
        <p>
          The interface for this section will be implemented as a
          dedicated component.
        </p>
        <span className="pa-admin-content__route">
          {activePath}
        </span>
      </section>
    </div>
  );
}
