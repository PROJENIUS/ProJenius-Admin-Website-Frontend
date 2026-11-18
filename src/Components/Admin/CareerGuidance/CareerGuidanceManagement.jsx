/* =========================================================
   PROJENIUS ADMIN — CAREER GUIDANCE CALLS
   Settings: fee, Google Meet link, call length, booking on/off.
   Bookings: upcoming / past calls, mark done, cancel, refund,
   retry emails and download receipt.
========================================================= */

import { useCallback, useEffect, useState } from "react";
import { hasPermission } from "../../../utils/adminAccess";
import {
  downloadGuidanceReceipt, getGuidanceSettings, listGuidanceBookings, refundGuidanceBooking,
  retryGuidanceEmails, saveGuidanceSettings, updateGuidanceBooking,
} from "../../../services/guidanceService";
import "./CareerGuidanceManagement.css";

const inr = (minor) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format((minor || 0) / 100);
const when = (v) => v ? new Date(v).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const STATUS = { confirmed: "Upcoming", completed: "Done", cancelled: "Cancelled", refunded: "Refunded", payment_failed: "Payment failed", pending_payment: "Not paid" };
const EMAIL = { sent: "Sent", failed: "Failed", pending: "Pending", not_configured: "Not set up" };

export default function CareerGuidanceManagement({ admin }) {
  const can = (p) => hasPermission(admin, p);
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({ fee: "", meetLink: "", callMinutes: 30, bookingOpen: true });
  const [filters, setFilters] = useState({ when: "upcoming", status: "", search: "", page: 1 });
  const [data, setData] = useState({ items: [], counts: {}, pagination: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refunding, setRefunding] = useState(null);
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, list] = await Promise.all([getGuidanceSettings(), listGuidanceBookings(filters)]);
      setSettings(s.item);
      setDraft((d) => (d.loaded ? d : { fee: String(s.item.feeMinor / 100), meetLink: s.item.meetLink || "", callMinutes: s.item.callMinutes, bookingOpen: s.item.bookingOpen, loaded: true }));
      setData(list);
    } catch (e) {
      setError(e.message || "Career guidance data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  async function run(key, action, success) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy("");
    }
  }

  function saveSettings(event) {
    event.preventDefault();
    const feeMinor = Math.round(Number(draft.fee) * 100);
    if (!Number.isSafeInteger(feeMinor) || feeMinor < 100) { setError("Enter a fee of at least ₹1."); return; }
    void run("settings", () => saveGuidanceSettings({ feeMinor, meetLink: draft.meetLink.trim(), callMinutes: Number(draft.callMinutes), bookingOpen: draft.bookingOpen }), "Settings saved. New bookings use the new fee and Meet link.");
  }

  function submitRefund(event) {
    event.preventDefault();
    const amountMinor = Math.round(Number(refundForm.amount) * 100);
    void run(`refund-${refunding._id}`, () => refundGuidanceBooking(refunding._id, { amountMinor, reason: refundForm.reason.trim() }), `Refund of ${inr(amountMinor)} sent to Razorpay for ${refunding.student.name}.`)
      .then((ok) => { if (ok) setRefunding(null); });
  }

  const c = data.counts || {};
  const tiles = [
    ["Upcoming calls", c.confirmed?.count || 0, "is-blue"],
    ["Done", c.completed?.count || 0, "is-green"],
    ["Refunded", c.refunded?.count || 0, "is-amber"],
    ["Collected", inr(["confirmed", "completed"].reduce((n, k) => n + (c[k]?.amountMinor || 0), 0)), "is-cyan"],
  ];

  return (
    <section className="pcg">
      <header className="pcg-head">
        <div><span>CAREER GUIDANCE</span><h2>1:1 guidance calls</h2><p>Students pick a slot and pay on the website. Each paid booking locks that slot.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
      </header>

      {error && <p className="pcg-msg is-error" role="alert">{error}</p>}
      {notice && <p className="pcg-msg" role="status">{notice}</p>}

      <div className="pcg-tiles">{tiles.map(([label, value, tone]) => <article key={label} className={tone}><span>{label}</span><strong>{value}</strong></article>)}</div>

      {settings && (
        <form className="pcg-card pcg-settings" onSubmit={saveSettings}>
          <h3>Settings</h3>
          <label>Fee (₹)<input id="pcg-fee" type="number" min="1" step="1" value={draft.fee} disabled={!can("guidance:settings")} onChange={(e) => setDraft((d) => ({ ...d, fee: e.target.value }))} /></label>
          <label className="pcg-wide">Google Meet link (same for every call)<input id="pcg-meet" type="url" placeholder="https://meet.google.com/abc-defg-hij" value={draft.meetLink} disabled={!can("guidance:settings")} onChange={(e) => setDraft((d) => ({ ...d, meetLink: e.target.value }))} /></label>
          <label>Call length (minutes)<input id="pcg-minutes" type="number" min="10" max="180" value={draft.callMinutes} disabled={!can("guidance:settings")} onChange={(e) => setDraft((d) => ({ ...d, callMinutes: e.target.value }))} /></label>
          <label className="pcg-check"><input id="pcg-open" type="checkbox" checked={draft.bookingOpen} disabled={!can("guidance:settings")} onChange={(e) => setDraft((d) => ({ ...d, bookingOpen: e.target.checked }))} /> Booking is open on the website</label>
          <p className="pcg-hint">Daily fixed slots: {settings.slotTimes.join(", ")} IST. Students can also pick a custom time between 8:00 AM and 9:45 PM.</p>
          {can("guidance:settings") && <button type="submit" className="pcg-primary" disabled={busy === "settings"}>{busy === "settings" ? "Saving…" : "Save settings"}</button>}
        </form>
      )}

      <div className="pcg-filters">
        <div className="pcg-chips" role="group" aria-label="Show">
          {[["upcoming", "Upcoming"], ["past", "Past"], ["", "All"]].map(([k, label]) => (
            <button key={label} type="button" aria-pressed={filters.when === k} onClick={() => setFilters((f) => ({ ...f, when: k, page: 1 }))}>{label}</button>
          ))}
        </div>
        <label>Status<select id="pcg-status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">Paid bookings</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
        <label>Search<input id="pcg-search" placeholder="Name, email, phone or reference" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} /></label>
      </div>

      <div className="pcg-card pcg-table"><table>
        <thead><tr><th>Call time</th><th>Student</th><th>Preparing for</th><th>Paid</th><th>Status</th><th>Emails</th><th>Actions</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan="7">Loading bookings…</td></tr> : data.items.length === 0 ? <tr><td colSpan="7">No bookings here yet.</td></tr> : data.items.map((b) => {
            const emailFailed = ["failed", "not_configured"].includes(b.customerEmailStatus) || ["failed", "not_configured"].includes(b.adminEmailStatus);
            const paidBooking = ["confirmed", "completed", "cancelled"].includes(b.status);
            return (
              <tr key={b._id}>
                <td><strong>{when(b.slotStart)}</strong><span>{b.slotType === "custom" ? "Custom time" : "Fixed slot"} · {b.callMinutes} min</span></td>
                <td><strong>{b.student.name}</strong><span>{b.student.email}</span><span>{b.student.phone}</span></td>
                <td>{b.targetRole || "—"}{b.notes && <span title={b.notes}>“{b.notes.slice(0, 60)}{b.notes.length > 60 ? "…" : ""}”</span>}</td>
                <td><strong>{inr(b.amountMinor)}</strong><span>{b.reference}</span>{b.refund?.amountMinor ? <span>Refunded {inr(b.refund.amountMinor)}</span> : null}</td>
                <td><em className={`pcg-pill is-${b.status}`}>{STATUS[b.status] || b.status}</em></td>
                <td><span className={b.customerEmailStatus === "sent" ? "" : "pcg-bad"}>Student: {EMAIL[b.customerEmailStatus] || b.customerEmailStatus}</span><span className={b.adminEmailStatus === "sent" ? "" : "pcg-bad"}>Admin: {EMAIL[b.adminEmailStatus] || b.adminEmailStatus}</span></td>
                <td className="pcg-actions">
                  {b.status === "confirmed" && can("guidance:manage") && <button type="button" disabled={!!busy} onClick={() => void run(b._id, () => updateGuidanceBooking(b._id, "complete"), "Marked as done.")}>Mark done</button>}
                  {b.status === "confirmed" && can("guidance:manage") && <button type="button" disabled={!!busy} onClick={() => void run(b._id, () => updateGuidanceBooking(b._id, "cancel"), "Booking cancelled; the slot is free again.")}>Cancel</button>}
                  {["completed", "cancelled"].includes(b.status) && can("guidance:manage") && <button type="button" disabled={!!busy} onClick={() => void run(b._id, () => updateGuidanceBooking(b._id, "reopen"), "Booking reopened.")}>Reopen</button>}
                  {paidBooking && emailFailed && can("guidance:manage") && <button type="button" className="pcg-primary" disabled={!!busy} onClick={() => void run(b._id, () => retryGuidanceEmails(b._id), "Emails sent.")}>{busy === b._id ? "Sending…" : "Retry email"}</button>}
                  {paidBooking && can("guidance:refund") && <button type="button" className="pcg-danger" disabled={!!busy} onClick={() => { setRefunding(b); setRefundForm({ amount: String(b.amountMinor / 100), reason: "" }); }}>Refund</button>}
                  {b.paymentId && <button type="button" onClick={() => void downloadGuidanceReceipt(b._id, b.reference).catch((e) => setError(e.message))}>Receipt</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>

      {refunding && (
        <div className="pcg-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setRefunding(null); }}>
          <form className="pcg-dialog" role="dialog" aria-modal="true" aria-labelledby="pcg-refund-title" onSubmit={submitRefund}>
            <h3 id="pcg-refund-title">Refund {refunding.student.name}</h3>
            <p>{when(refunding.slotStart)} · paid {inr(refunding.amountMinor)} · {refunding.reference}</p>
            <label>Amount (₹)<input id="pcg-refund-amount" type="number" min="1" step="1" max={refunding.amountMinor / 100} value={refundForm.amount} onChange={(e) => setRefundForm((f) => ({ ...f, amount: e.target.value }))} /></label>
            <label>Reason<textarea id="pcg-refund-reason" rows="3" required minLength="3" placeholder="e.g. Student was not satisfied with the session" value={refundForm.reason} onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))} /></label>
            <p className="pcg-hint">The money goes back to the student’s original payment method through Razorpay (usually 5–7 working days). The slot is freed.</p>
            <div className="pcg-actions">
              <button type="submit" className="pcg-danger" disabled={busy.startsWith("refund")}>{busy.startsWith("refund") ? "Refunding…" : "Refund now"}</button>
              <button type="button" onClick={() => setRefunding(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
