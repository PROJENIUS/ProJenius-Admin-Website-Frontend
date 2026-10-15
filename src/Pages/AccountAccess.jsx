/* =========================================================
   PROJENIUS ADMIN — INVITATION AND PASSWORD RECOVERY
========================================================= */

import { useState } from "react";
import {
  acceptAdministratorInvitation,
  requestAdminPasswordReset,
  resetAdminPassword,
} from "../services/adminAuth";

const modes = {
  invite: { title: "Create your administrator account", action: "Create account" },
  forgot: { title: "Reset your password", action: "Send reset link" },
  reset: { title: "Choose a new password", action: "Update password" },
};

export default function AccountAccess({ mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
        <a className="pa-access-brand" href="/">ProJenius <span>ADMIN</span></a>
        <h1>{modes[mode].title}</h1>
        <p className="pa-access-intro">
          {mode === "forgot"
            ? "Enter your administrator email. If it matches an active account, we will send a one-time recovery link."
            : "This secure, single-use link is required to continue."}
        </p>
        <form onSubmit={handleSubmit} className="pa-access-form">
          {mode === "forgot" && (
            <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          )}
          {mode !== "forgot" && (
            <>
              <label>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
              <label>Confirm password<input type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            </>
          )}
          {error && <p className="pa-access-error" role="alert">{error}</p>}
          {status && <p className="pa-access-success" role="status">{status}</p>}
          <button type="submit" disabled={busy || (mode !== "forgot" && !token)}>{busy ? "Please wait…" : modes[mode].action}</button>
        </form>
        <a className="pa-access-back" href="/">Return to sign in</a>
      </section>
    </main>
  );
}
