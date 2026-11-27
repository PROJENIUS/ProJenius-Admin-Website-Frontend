
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

  const [slowStart, setSlowStart] = useState(false);

  useEffect(() => {
    Promise.resolve().then(checkSession);
    const timer = window.setTimeout(() => setSlowStart(true), 2500);
    return () => window.clearTimeout(timer);
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
  // The free backend host sleeps after 15 quiet minutes and takes up to two
  // minutes to wake. A short check shows a brief message; a slow one shows
  // the sign-in form straight away with a note, and switches to the
  // dashboard by itself if the session turns out to be valid.
  if (isCheckingSession && !slowStart) {
    return (
      <main className="pa-auth-loading" role="status">
        <p>Verifying your admin session...</p>
      </main>
    );
  }

  // SECTION: APPLICATION ACCESS
  if (!admin) {
    return (
      <>
        {isCheckingSession && (
          <p className="pa-auth-waking" role="status">
            Waking up the server. After a quiet period this can take up to a minute; you can enter your details meanwhile.
          </p>
        )}
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return <AdminPages admin={admin} onLogout={handleLogout} />;
}
