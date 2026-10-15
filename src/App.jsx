
/* =========================================================
   PROJENIUS ADMIN — APPLICATION
   Responsibilities: Authentication and access state
========================================================= */

import { useCallback, useEffect, useState } from "react";

import Login from "./Pages/Login";
import AdminPages from "./Pages/AdminPages";
import AccountAccess from "./Pages/AccountAccess";

import {
  getAdminCsrfToken,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from "./services/adminAuth";

export default function App() {
  const route = window.location.pathname;
  if (route === "/accept-invitation") return <AccountAccess mode="invite" />;
  if (route === "/forgot-password") return <AccountAccess mode="forgot" />;
  if (route === "/reset-password") return <AccountAccess mode="reset" />;

  return <AdminApplication />;
}

function AdminApplication() {
  // SECTION: AUTHENTICATION STATE
  const [admin, setAdmin] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // SECTION: RESTORE SERVER SESSION
  const checkSession = useCallback(async () => {
    try {
      await getAdminCsrfToken();

      const result = await getAdminSession();
      setAdmin(result.admin);
    } catch {
      setAdmin(null);
    } finally {
      setIsCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(checkSession);
  }, [checkSession]);

  // SECTION: AUTHENTICATE ADMIN
  async function handleLogin(email, password, rememberMe) {
    try {
      await getAdminCsrfToken();

      const result = await loginAdmin(
        email,
        password,
        rememberMe
      );

      setAdmin(result.admin);
    } catch (error) {
      setAdmin(null);
      throw new Error(
        "Unable to sign in. Check your credentials and try again.",
        { cause: error }
      );
    }
  }

  // SECTION: END SERVER SESSION
  async function handleLogout() {
    try {
      await logoutAdmin();
    } finally {
      setAdmin(null);
    }
  }

  // SECTION: SESSION LOADING STATE
  if (isCheckingSession) {
    return (
      <main className="pa-auth-loading" role="status">
        <p>Verifying your admin session...</p>
      </main>
    );
  }

  // SECTION: APPLICATION ACCESS
  if (!admin) {
    return <Login onLogin={handleLogin} />;
  }

  return <AdminPages admin={admin} onLogout={handleLogout} />;
}
