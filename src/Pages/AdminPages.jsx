
/* =========================================================
   PROJENIUS ADMIN — ADMIN PAGE
   Responsibility: Render the admin workspace
========================================================= */

import AdminWorkspace from "../Components/Admin/AdminWorkspace/AdminWorkspace";

export default function AdminPages({ admin, onLogout }) {
  return <AdminWorkspace admin={admin} onLogout={onLogout} />;
}
