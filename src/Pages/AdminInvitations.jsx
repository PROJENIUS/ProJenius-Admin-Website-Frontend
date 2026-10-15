/* =========================================================
   PROJENIUS ADMIN — ISSUE ADMINISTRATOR INVITATIONS
========================================================= */

import { useState } from "react";
import { inviteAdministrator } from "../services/adminAuth";

export default function AdminInvitations() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await inviteAdministrator(name.trim(), email.trim());
      setMessage(result.message);
      setName("");
      setEmail("");
    } catch (requestError) {
      setError(requestError.message || "The invitation could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pa-admin-content">
      <header className="pa-admin-content__heading">
        <span className="pa-admin-content__eyebrow">ADMINISTRATION</span>
        <h1>Invite an administrator</h1>
        <p>Send a single-use account creation link that expires after 24 hours.</p>
      </header>
      <form className="pa-access-form pa-admin-invite-form" onSubmit={submit}>
        <label>Administrator name<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Email address<input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {error && <p className="pa-access-error" role="alert">{error}</p>}
        {message && <p className="pa-access-success" role="status">{message}</p>}
        <button type="submit" disabled={busy}>{busy ? "Sending invitation…" : "Send invitation"}</button>
      </form>
    </section>
  );
}
