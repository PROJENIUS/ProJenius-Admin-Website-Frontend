/* =========================================================
   PROJENIUS ADMIN — APPLICATION ENTRY
========================================================= */

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

/* Component styles — centralized imports */
import "./Components/Login/LoginBrand/LoginBrand.css";
import "./Components/Login/LoginForm/LoginForm.css";
import "./Components/Admin/AdminSidebar/AdminSidebar.css";
import "./Components/Admin/AdminHeader/AdminHeader.css";
import "./Components/Admin/AdminWorkspace/AdminWorkspace.css";
import "./Pages/AccountAccess.css";

/* =========================================================
   APPLICATION RENDER
========================================================= */

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
