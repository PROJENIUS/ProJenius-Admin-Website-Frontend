/* =========================================================
   PROJENIUS ADMIN — INVITATION AND PASSWORD RECOVERY
========================================================= */

import { useEffect, useState } from "react";
import {
  acceptAdministratorInvitation,
  requestAdminPasswordReset,
  resetAdminPassword,
} from "../services/adminAuth";

const modes = {
  invite: { title: "Create your administrator account", action: "Create account" },
  forgot: { title: "Forgot your password?", action: "Send reset link" },
  reset: { title: "Set a new password", action: "Submit" },
};

export default function AccountAccess({ mode }) {
  useEffect(() => {
    document.title = mode === "forgot"
      ? "Password Recovery | ProJenius Admin"
      : mode === "reset"
        ? "Reset Password | ProJenius Admin"
        : "Account Access | ProJenius Admin";
  }, [mode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setStatus("");
    if (mode !== "forgot" && password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (["invite", "reset"].includes(mode) && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "forgot"
        ? await requestAdminPasswordReset(email)
        : mode === "invite"
          ? await acceptAdministratorInvitation(token, password)
          : await resetAdminPassword(token, password);
      setStatus(result.message);
      setDone(mode !== "forgot");
      setPassword("");
      setConfirmation("");
    } catch (requestError) {
      setError(requestError.message || "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pa-access-page">
      <section className="pa-access-card">
        <a className="pa-access-brand" href="/" aria-label="ProJenius Admin sign in">
          <img src="/ProJenius_Logo.svg" alt="" />
          <span>ProJenius Innovation Technology<strong>ProJenius Admin</strong></span>
        </a>
        <h1>{modes[mode].title}</h1>
        <p className="pa-access-intro">
          {mode === "forgot"
            ? "Enter the email you sign in with. If it belongs to an active account, we will email you a reset link (valid for 30 minutes)."
            : token
              ? "Enter your new password twice. It must be at least 12 characters."
              : "This page needs the link from your email. Request a new reset link if it has expired."}
        </p>
        <form onSubmit={handleSubmit} className="pa-access-form">
          {mode === "forgot" && (
            <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          )}
          {mode !== "forgot" && (
            <>
              <label>New password
                <span className="pa-access-password">
                  <input type={show ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button type="button" onClick={() => setShow((value) => !value)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
                </span>
              </label>
              <label>Confirm new password
                <input type={show ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={1024} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </label>
              {confirmation && (
                <p className={password === confirmation ? "pa-access-hint pa-access-hint--ok" : "pa-access-hint"}>
                  {password.length < 12 ? `${12 - password.length} more characters needed` : password === confirmation ? "Passwords match" : "Passwords do not match yet"}
                </p>
              )}
            </>
          )}
          {error && <p className="pa-access-error" role="alert">{error}</p>}
          {status && <p className="pa-access-success" role="status">{status}</p>}
          {done
            ? <a className="pa-access-button" href="/">Go to sign in</a>
            : <button type="submit" disabled={busy || (mode !== "forgot" && !token)}>{busy ? "Please wait…" : modes[mode].action}</button>}
          {mode === "reset" && !token && <a className="pa-access-back" href="/forgot-password">Request a new reset link</a>}
        </form>
        <a className="pa-access-back" href="/">Return to sign in</a>
      </section>
    </main>
  );
}
