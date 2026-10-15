import { useCallback, useEffect, useRef, useState } from "react";
import { inviteAdministrator } from "../services/adminAuth";
import {
  listAdminAuditEvents,
  listAdministrators,
  listPendingInvitations,
  getAdministrator,
  removeAdmin,
  resendAdminInvitation,
  sendAdminPasswordReset,
  setAdminActive,
  updateAdminPermissions,
} from "../services/adminManagementService";
import "./AdminManagement.css";
import { createRequestSequence } from "../utils/requestSequence";
import { DEFAULT_REGULAR_ADMIN_PERMISSIONS, PERMISSION_MODULES } from "../utils/permissionOptions";

function date(value) {
  if (!value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : parsed.toLocaleString();
}

export default function AdminManagement() {
  const [tab, setTab] = useState("accounts");
  const [filters, setFilters] = useState({ search: "", role: "", status: "", page: 1, limit: 20 });
  const [draftFilters, setDraftFilters] = useState({ search: "", role: "", status: "" });
  const [accounts, setAccounts] = useState({ items: [], pagination: {}, counts: {} });
  const [invitations, setInvitations] = useState({ items: [], pagination: {} });
  const [audit, setAudit] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [invite, setInvite] = useState({ name: "", email: "", permissions: [...DEFAULT_REGULAR_ADMIN_PERMISSIONS] });
  const requestSequence = useRef(null);
  if (requestSequence.current === null) requestSequence.current = createRequestSequence();

  const load = useCallback(async () => {
    const requestId = requestSequence.current.begin();
    setLoading(true);
    setError("");
    try {
      if (tab === "accounts") {
        const result = await listAdministrators(filters);
        if (requestSequence.current.isLatest(requestId)) setAccounts(result);
      }
      if (tab === "invitations") {
        const result = await listPendingInvitations({ page: filters.page, limit: 20 });
        if (requestSequence.current.isLatest(requestId)) setInvitations(result);
      }
      if (tab === "audit") {
        const result = await listAdminAuditEvents({ page: filters.page, limit: 20 });
        if (requestSequence.current.isLatest(requestId)) setAudit(result);
      }
    } catch (requestError) {
      if (requestSequence.current.isLatest(requestId)) setError(requestError.message || "Administrator data could not be loaded.");
    } finally {
      if (requestSequence.current.isLatest(requestId)) setLoading(false);
    }
  }, [filters, tab]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; requestSequence.current.invalidate(); };
  }, [load]);

  async function perform(action, successMessage) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      setEditing(null);
      await load();
      return true;
    } catch (requestError) {
      setError(requestError.message || "The administrator action could not be completed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEdit(account) {
    setEditing(account);
    setEditPermissions(account.permissions || []);
  }

  function submitInvite(event) {
    event.preventDefault();
    void perform(
      () => inviteAdministrator(invite.name.trim(), invite.email.trim(), invite.permissions),
      "Account setup invitation sent."
    ).then((success) => {
      if (success) setInvite({ name: "", email: "", permissions: [...DEFAULT_REGULAR_ADMIN_PERMISSIONS] });
    });
  }

  const activeCounts = accounts.counts || {};
  const pagination = tab === "accounts" ? accounts.pagination : tab === "invitations" ? invitations.pagination : audit.pagination;

  return (
    <section className="pa-admin-management">
      <header className="pa-admin-management__hero">
        <div><span>SECURITY & ACCESS</span><h2>Administrator Control Centre</h2><p>Manage administrator access and review security-sensitive activity.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
      </header>

      <div className="pa-admin-management__stats" aria-label="Administrator account counts">
        <article><span>Total accounts</span><strong>{activeCounts.total ?? "—"}</strong></article>
        <article><span>Active</span><strong>{activeCounts.active ?? "—"}</strong></article>
        <article><span>Deactivated</span><strong>{activeCounts.deactivated ?? "—"}</strong></article>
      </div>

      <nav className="pa-admin-management__tabs" aria-label="Administrator management sections">
        {[ ["accounts", "Accounts"], ["invitations", "Invitations"], ["audit", "Audit history"] ].map(([key, label]) => (
          <button type="button" key={key} aria-current={tab === key ? "page" : undefined} onClick={() => { setTab(key); setFilters((value) => ({ ...value, page: 1 })); }}>{label}</button>
        ))}
      </nav>

      {error && <p className="pa-admin-management__feedback pa-admin-management__feedback--error" role="alert">{error}</p>}
      {notice && <p className="pa-admin-management__feedback" role="status">{notice}</p>}

      {tab === "accounts" && (
        <>
          <form className="pa-admin-management__filters" onSubmit={(event) => { event.preventDefault(); setFilters((value) => ({ ...value, ...draftFilters, page: 1 })); }}>
            <label>Search<input value={draftFilters.search} onChange={(event) => setDraftFilters((value) => ({ ...value, search: event.target.value }))} placeholder="Name or email" /></label>
            <label>Role<select value={draftFilters.role} onChange={(event) => setDraftFilters((value) => ({ ...value, role: event.target.value }))}><option value="">All roles</option><option value="superadmin">Super Admin</option><option value="admin">Admin</option></select></label>
            <label>Status<select value={draftFilters.status} onChange={(event) => setDraftFilters((value) => ({ ...value, status: event.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="deactivated">Deactivated</option><option value="removed">Removed</option></select></label>
            <button type="submit">Apply filters</button>
            <button type="button" onClick={() => { const cleared = { search: "", role: "", status: "" }; setDraftFilters(cleared); setFilters((value) => ({ ...value, ...cleared, page: 1 })); }}>Reset</button>
          </form>
          <div className="pa-admin-management__table-wrap"><table><thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th>Created</th><th>Last login</th><th>Actions</th></tr></thead><tbody>
            {loading ? <tr><td colSpan="6">Loading accounts…</td></tr> : accounts.items.length === 0 ? <tr><td colSpan="6">No administrator accounts match these filters.</td></tr> : accounts.items.map((account) => (
              <tr key={account._id}><td><strong>{account.name || "Unnamed account"}</strong><span>{account.email}</span></td><td>{account.role === "superadmin" ? "Super Admin" : "Admin"}</td><td><span className={`pa-admin-management__status pa-admin-management__status--${account.status}`}>{account.status}</span></td><td>{date(account.createdAt)}</td><td>{date(account.lastLoginAt)}</td><td className="pa-admin-management__actions">
                <button type="button" disabled={busy} onClick={async () => { try { setDetails((await getAdministrator(account._id)).item); } catch (loadError) { setError(loadError.message); } }}>View details</button>
                {account.role === "admin" && account.status !== "removed" && <button type="button" onClick={() => startEdit(account)}>Permissions</button>}
                {account.role === "admin" && account.status !== "removed" && <button type="button" disabled={busy} onClick={() => { const action = account.isActive ? "deactivate" : "reactivate"; if (window.confirm(`${action === "deactivate" ? "Deactivate" : "Reactivate"} ${account.email}?`)) void perform(() => setAdminActive(account._id, !account.isActive), account.isActive ? "Administrator deactivated." : "Administrator reactivated."); }}>{account.isActive ? "Deactivate" : "Reactivate"}</button>}
                {account.role === "admin" && account.status === "active" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Send a password reset link to ${account.email}?`)) void perform(() => sendAdminPasswordReset(account._id), "Password reset email sent."); }}>Reset password</button>}
                {account.role === "admin" && account.status !== "removed" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Remove ${account.email} from administrator access? This preserves the account and audit history.`)) void perform(() => removeAdmin(account._id), "Administrator access removed."); }}>Remove</button>}
              </td></tr>
            ))}
          </tbody></table></div>
          {details && <section className="pa-admin-management__editor"><div><h3>{details.name || "Administrator"}</h3><p>{details.email} · {details.role === "superadmin" ? "Super Admin" : "Admin"} · {details.status}</p></div><dl className="pa-admin-management__detail-grid"><div><dt>Created</dt><dd>{date(details.createdAt)}</dd></div><div><dt>Last login</dt><dd>{date(details.lastLoginAt)}</dd></div><div><dt>Permissions</dt><dd>{details.role === "superadmin" ? "Full Super Admin access" : (details.permissions || []).join(", ") || "No assigned permissions"}</dd></div></dl><button type="button" onClick={() => setDetails(null)}>Close details</button></section>}
          {editing && <section className="pa-admin-management__editor"><div><h3>Permissions for {editing.email}</h3><p>Changes are enforced from the database on the next authenticated request.</p></div>
            <PermissionSelector value={editPermissions} onChange={setEditPermissions} />
            <div className="pa-admin-management__actions"><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Apply the selected permissions to ${editing.email}?`)) void perform(() => updateAdminPermissions(editing._id, editPermissions), "Permissions updated."); }}>Save permissions</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></div>
          </section>}
          <form className="pa-admin-management__invite" onSubmit={submitInvite}><h3>Invite a regular Admin</h3><p>They set their own password through a single-use, expiring link.</p><div className="pa-admin-management__filters"><label>Name<input required maxLength="120" value={invite.name} onChange={(event) => setInvite((value) => ({ ...value, name: event.target.value }))} /></label><label>Email<input required type="email" maxLength="254" value={invite.email} onChange={(event) => setInvite((value) => ({ ...value, email: event.target.value }))} /></label></div>
            <PermissionSelector value={invite.permissions} onChange={(permissions) => setInvite((value) => ({ ...value, permissions }))} />
            <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button>
          </form>
        </>
      )}

      {tab === "invitations" && <div className="pa-admin-management__table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Expires</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan="4">Loading invitations…</td></tr> : invitations.items.length === 0 ? <tr><td colSpan="4">No pending invitations.</td></tr> : invitations.items.map((item) => <tr key={item._id}><td>{item.name}</td><td>{item.email}</td><td>{date(item.expiresAt)}</td><td><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Invalidate the current setup link and send a new one to ${item.email}?`)) void perform(() => resendAdminInvitation(item._id), `A new setup invitation was sent to ${item.email}.`); }}>Resend setup link</button></td></tr>)}</tbody></table></div>}

      {tab === "audit" && <div className="pa-admin-management__table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Target</th><th>Safe metadata</th></tr></thead><tbody>{loading ? <tr><td colSpan="5">Loading audit history…</td></tr> : audit.items.length === 0 ? <tr><td colSpan="5">No audit events recorded.</td></tr> : audit.items.map((item) => <tr key={item._id}><td>{date(item.createdAt)}</td><td>{item.action}</td><td>{item.actorId?.name || item.actorId?.email || "System"}</td><td>{item.targetAdminId?.email || item.metadata?.email || "—"}</td><td>{Object.keys(item.metadata || {}).join(", ") || "—"}</td></tr>)}</tbody></table></div>}

      <footer className="pa-admin-management__pagination"><span>{pagination.total ?? 0} records · page {pagination.page || 1}{pagination.pages ? ` of ${pagination.pages}` : ""}</span><div><button type="button" disabled={loading || (pagination.page || 1) <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}>Previous</button><button type="button" disabled={loading || !pagination.pages || pagination.page >= pagination.pages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}>Next</button></div></footer>
      <p className="pa-admin-management__note">Courses, registrations and media remain unavailable until their backend modules are implemented. News &amp; Insights is managed in its unified publishing workspace.</p>
    </section>
  );
}

function PermissionSelector({ value, onChange }) {
  function toggle(permission, selected) {
    onChange(selected
      ? [...new Set([...value, permission])]
      : value.filter((current) => current !== permission));
  }

  return (
    <div className="pa-admin-management__permission-grid" aria-label="Regular Admin permission selection">
      {PERMISSION_MODULES.map((module) => (
        <fieldset key={module.label} className={module.status !== "available" ? "pa-admin-management__permission-module--restricted" : undefined}>
          <legend>{module.label}{module.status === "unavailable" ? " · unavailable" : module.status === "superadmin-only" ? " · Super Admin only" : ""}</legend>
          {module.actions.map((action) => (
            action.permission ? (
              <label key={action.permission}>
                <input type="checkbox" checked={value.includes(action.permission)} onChange={(event) => toggle(action.permission, event.target.checked)} />
                {action.label}
              </label>
            ) : (
              <label key={action.label} className="pa-admin-management__permission-disabled">
                <input type="checkbox" disabled checked={false} readOnly />
                {action.label}
              </label>
            )
          ))}
          {module.status === "unavailable" && <p className="pa-admin-management__permission-note">This module has no implemented API and cannot be granted to an Admin.</p>}
          {module.status === "superadmin-only" && <p className="pa-admin-management__permission-note">Access comes from the Super Admin role and cannot be assigned here.</p>}
        </fieldset>
      ))}
    </div>
  );
}
