import { useCallback, useEffect, useRef, useState } from "react";
import "../Components/Admin/AdminManagement/AdminManagement.css";
import {
  createAdministrator,
  getAdministrator,
  listAdminAuditEvents,
  listAdministrators,
  removeAdmin,
  sendAdminPasswordReset,
  setAdminActive,
  setAdminPassword,
  setAdminRole,
  updateAdminPermissions,
} from "../services/adminManagementService";
import { createRequestSequence } from "../utils/requestSequence";
import { DEFAULT_REGULAR_ADMIN_PERMISSIONS, PERMISSION_MODULES } from "../utils/permissionOptions";

/* =========================================================
   USERS & ACTIVITY — Super Admin only.
   Users: the Super Admin creates Admin / Staff accounts and
   sets their first password. Everyone can later change their
   own password through "Forgot password" on the sign-in page.
   Activity log: every sign-in, failed sign-in, sign-out,
   account change and content edit, newest first.
========================================================= */

const STAFF_PERMISSIONS = ["dashboard:view", "enquiries:list", "enquiries:details"];
const MIN_PASSWORD = 12;
const ROLE_LABEL = { superadmin: "Super Admin", admin: "Admin", staff: "Staff" };
const EMPTY_NEW_USER = { name: "", email: "", role: "admin", password: "", confirm: "", permissions: [...DEFAULT_REGULAR_ADMIN_PERMISSIONS] };

const CATEGORIES = [
  ["", "All activity"],
  ["signin", "Sign-ins"],
  ["accounts", "Accounts & passwords"],
  ["changes", "Content changes"],
];

function date(value) {
  if (!value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : parsed.toLocaleString();
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*";
  const values = new Uint32Array(14);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

function person(ref) {
  return ref?.name || ref?.email || "";
}

/* Plain-English line for one audit event. */
function describe(item) {
  const m = item.metadata || {};
  const target = item.targetAdminId?.email || m.email || "an account";
  switch (item.action) {
    case "login.success": return { tone: "ok", text: "Signed in" };
    case "login.failed": return {
      tone: "warn",
      text: `Failed sign-in for ${m.email || "unknown email"}`,
      detail: { unknown_email: "No account with this email", wrong_password: "Wrong password", account_inactive: "Account is deactivated" }[m.reason] || "",
    };
    case "logout": return { tone: "", text: "Signed out" };
    case "security.alert_sent": return { tone: "warn", text: `Security alert emailed: ${m.attempts || 5} failed sign-ins for ${m.email || "an account"}`, detail: m.status === "sent" ? "Email sent" : "Email not sent (check Gmail settings)" };
    case "account.created": return { tone: "ok", text: `Created ${ROLE_LABEL[m.role] || "user"} account for ${m.email || target}` };
    case "account.role_changed": return { tone: "", text: `Changed role of ${target}`, detail: `${ROLE_LABEL[m.previous] || m.previous} → ${ROLE_LABEL[m.current] || m.current}` };
    case "account.deactivated": return { tone: "warn", text: `Deactivated ${target}` };
    case "account.reactivated": return { tone: "ok", text: `Reactivated ${target}` };
    case "account.removed": return { tone: "warn", text: `Removed ${target}` };
    case "permissions.changed": return { tone: "", text: `Changed permissions of ${target}`, detail: `${(m.current || []).length} permissions` };
    case "password.set_by_superadmin": return { tone: "", text: `Set a new password for ${target}` };
    case "password_reset.initiated": return m.source === "superadmin"
      ? { tone: "", text: `Sent a password reset link to ${target}` }
      : { tone: "", text: "Requested a password reset link" };
    case "password_reset.completed": return { tone: "ok", text: "Changed password using the reset link" };
    case "invitation.created": return { tone: "", text: `Invited ${m.email || "a user"}` };
    case "invitation.resent": return { tone: "", text: `Resent invitation to ${m.email || "a user"}` };
    case "invitation.accepted": return { tone: "ok", text: "Accepted invitation and set a password" };
    case "activity.change": return { tone: "", text: `${m.area || "Admin panel"}: ${m.change || "changed"}`, detail: m.summary || "" };
    default: return { tone: "", text: item.action };
  }
}

export default function AdminManagement() {
  const [tab, setTab] = useState("users");
  const [filters, setFilters] = useState({ search: "", role: "", status: "", page: 1, limit: 20 });
  const [draftFilters, setDraftFilters] = useState({ search: "", role: "", status: "" });
  const [activityFilters, setActivityFilters] = useState({ category: "", actor: "", page: 1 });
  const [accounts, setAccounts] = useState({ items: [], pagination: {}, counts: {} });
  const [people, setPeople] = useState([]);
  const [audit, setAudit] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState(null); // { type: "create" | "details" | "permissions" | "password", account }
  const [profileActivity, setProfileActivity] = useState({ items: [], loading: false, error: "" });
  const [editPermissions, setEditPermissions] = useState([]);
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [newPassword, setNewPassword] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const requestSequence = useRef(null);
  const profileRequest = useRef(0);
  if (requestSequence.current === null) requestSequence.current = createRequestSequence();

  const load = useCallback(async () => {
    const requestId = requestSequence.current.begin();
    setLoading(true);
    setError("");
    try {
      if (tab === "users") {
        const result = await listAdministrators(filters);
        if (requestSequence.current.isLatest(requestId)) setAccounts(result);
      } else {
        const [result, everyone] = await Promise.all([
          listAdminAuditEvents({ ...activityFilters, limit: 25 }),
          listAdministrators({ limit: 100 }),
        ]);
        if (requestSequence.current.isLatest(requestId)) {
          setAudit(result);
          setPeople(everyone.items || []);
        }
      }
    } catch (requestError) {
      if (requestSequence.current.isLatest(requestId)) setError(requestError.message || "Data could not be loaded.");
    } finally {
      if (requestSequence.current.isLatest(requestId)) setLoading(false);
    }
  }, [filters, activityFilters, tab]);

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
      setPanel(null);
      await load();
      return true;
    } catch (requestError) {
      setError(requestError.message || "The action could not be completed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openPanel(type, account = null) {
    profileRequest.current += 1;
    setError("");
    setNotice("");
    setShowPassword(false);
    if (type === "permissions") setEditPermissions(account.permissions || []);
    if (type === "password") setNewPassword({ password: "", confirm: "" });
    if (type === "create") setNewUser(EMPTY_NEW_USER);
    setPanel({ type, account });
  }

  async function openUserProfile(account) {
    openPanel("details", account);
    const requestId = profileRequest.current;
    setProfileActivity({ items: [], loading: true, error: "" });
    try {
      const [accountResult, activityResult] = await Promise.all([
        getAdministrator(account._id),
        listAdminAuditEvents({ actor: account._id, limit: 8 }),
      ]);
      if (profileRequest.current === requestId) {
        setPanel((current) => current?.account?._id === account._id
          ? { ...current, account: accountResult.item }
          : current);
        setProfileActivity({ items: activityResult.items || [], loading: false, error: "" });
      }
    } catch (requestError) {
      if (profileRequest.current === requestId) setProfileActivity({ items: [], loading: false, error: requestError.message || "This user’s activity could not be loaded." });
    }
  }

  function passwordProblem(password, confirm) {
    if (password.length < MIN_PASSWORD) return `The password must be at least ${MIN_PASSWORD} characters.`;
    if (password !== confirm) return "The two passwords do not match.";
    return "";
  }

  function submitCreate(event) {
    event.preventDefault();
    const problem = passwordProblem(newUser.password, newUser.confirm);
    if (problem) return setError(problem);
    void perform(
      () => createAdministrator({ name: newUser.name.trim(), email: newUser.email.trim(), role: newUser.role, password: newUser.password, permissions: newUser.permissions }),
      `${ROLE_LABEL[newUser.role]} account created for ${newUser.email.trim()}. Share the password with them securely.`
    );
  }

  function submitPassword(event) {
    event.preventDefault();
    const problem = passwordProblem(newPassword.password, newPassword.confirm);
    if (problem) return setError(problem);
    void perform(() => setAdminPassword(panel.account._id, newPassword.password), `New password set for ${panel.account.email}.`);
  }

  const counts = accounts.counts || {};
  const pagination = tab === "users" ? accounts.pagination : audit.pagination;
  const changePage = (delta) => (tab === "users"
    ? setFilters((value) => ({ ...value, page: value.page + delta }))
    : setActivityFilters((value) => ({ ...value, page: value.page + delta })));

  return (
    <section className="pa-admin-management">
      <header className="pa-admin-management__hero">
        <div><span>SUPER ADMIN</span><h2>Users &amp; Activity</h2><p>Create Admin and Staff accounts, and see everything that happens in the admin panel.</p></div>
        <div className="pa-admin-management__hero-actions">
          {tab === "users" && <button type="button" className="pa-admin-management__primary" onClick={() => openPanel("create")}>+ Add user</button>}
          <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
        </div>
      </header>

      <nav className="pa-admin-management__tabs" aria-label="Users and activity">
        {[["users", "Users"], ["activity", "Activity log"]].map(([key, label]) => (
          <button type="button" key={key} aria-current={tab === key ? "page" : undefined} onClick={() => { setTab(key); setPanel(null); }}>{label}</button>
        ))}
      </nav>

      {error && <p className="pa-admin-management__feedback pa-admin-management__feedback--error" role="alert">{error}</p>}
      {notice && <p className="pa-admin-management__feedback" role="status">{notice}</p>}

      {tab === "users" && (
        <>
          <div className="pa-admin-management__stats" aria-label="Account counts">
            <article><span>Total users</span><strong>{counts.total ?? "—"}</strong></article>
            <article><span>Active</span><strong>{counts.active ?? "—"}</strong></article>
            <article><span>Deactivated</span><strong>{counts.deactivated ?? "—"}</strong></article>
          </div>

          {panel?.type === "create" && (
            <form className="pa-admin-management__editor" onSubmit={submitCreate}>
              <div><h3>Add a user</h3><p>You set the first password. The user can change it any time with “Forgot password” on the sign-in page.</p></div>
              <div className="pa-admin-management__form-grid">
                <label>Full name<input required maxLength="120" value={newUser.name} onChange={(e) => setNewUser((v) => ({ ...v, name: e.target.value }))} /></label>
                <label>Gmail / email<input required type="email" maxLength="254" value={newUser.email} onChange={(e) => setNewUser((v) => ({ ...v, email: e.target.value }))} /></label>
                <label>Role
                  <select value={newUser.role} onChange={(e) => { const role = e.target.value; setNewUser((v) => ({ ...v, role, permissions: role === "staff" ? [...STAFF_PERMISSIONS] : [...DEFAULT_REGULAR_ADMIN_PERMISSIONS] })); }}>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>
                <span className="pa-admin-management__hint">{newUser.role === "staff" ? "Staff start with view-only access to the dashboard and enquiries." : "Admins start with dashboard, enquiries and career applications."} Adjust below.</span>
                <label>Password
                  <span className="pa-admin-management__password">
                    <input required type={showPassword ? "text" : "password"} minLength={MIN_PASSWORD} autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser((v) => ({ ...v, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPassword((s) => !s)}>{showPassword ? "Hide" : "Show"}</button>
                  </span>
                </label>
                <label>Confirm password
                  <input required type={showPassword ? "text" : "password"} minLength={MIN_PASSWORD} autoComplete="new-password" value={newUser.confirm} onChange={(e) => setNewUser((v) => ({ ...v, confirm: e.target.value }))} />
                </label>
                <span className="pa-admin-management__hint">
                  At least {MIN_PASSWORD} characters.{" "}
                  <button type="button" className="pa-admin-management__link" onClick={() => { const p = generatePassword(); setNewUser((v) => ({ ...v, password: p, confirm: p })); setShowPassword(true); }}>Generate a strong password</button>
                </span>
              </div>
              <PermissionSelector value={newUser.permissions} onChange={(permissions) => setNewUser((v) => ({ ...v, permissions }))} />
              <div className="pa-admin-management__actions">
                <button type="submit" className="pa-admin-management__primary" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
                <button type="button" onClick={() => setPanel(null)}>Cancel</button>
              </div>
            </form>
          )}

          <form className="pa-admin-management__filters" onSubmit={(event) => { event.preventDefault(); setFilters((value) => ({ ...value, ...draftFilters, page: 1 })); }}>
            <label>Search staff and admins<input value={draftFilters.search} onChange={(e) => setDraftFilters((v) => ({ ...v, search: e.target.value }))} placeholder="Search by name or email" /></label>
            <label>Role<select value={draftFilters.role} onChange={(e) => setDraftFilters((v) => ({ ...v, role: e.target.value }))}><option value="">All roles</option><option value="superadmin">Super Admin</option><option value="admin">Admin</option><option value="staff">Staff</option></select></label>
            <label>Status<select value={draftFilters.status} onChange={(e) => setDraftFilters((v) => ({ ...v, status: e.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="deactivated">Deactivated</option><option value="removed">Removed</option></select></label>
            <button type="submit">Apply</button>
            <button type="button" onClick={() => { const cleared = { search: "", role: "", status: "" }; setDraftFilters(cleared); setFilters((v) => ({ ...v, ...cleared, page: 1 })); }}>Reset</button>
          </form>

          <section className="pa-admin-management__directory" aria-label="Staff and admin directory">
            <header><div><h3>Team directory</h3><p>Open a person’s profile to see their account information and recent activity.</p></div><span>{accounts.pagination.total ?? 0} people</span></header>
            {loading ? <p className="pa-admin-management__directory-state" role="status">Loading team members…</p> : accounts.items.length === 0 ? <p className="pa-admin-management__directory-state">No users match this search. Try another name or email.</p> : <div className="pa-admin-management__people-grid">
              {accounts.items.map((account) => {
                const initials = String(account.name || account.email || "U").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                return <button type="button" className={`pa-admin-management__person-card${panel?.type === "details" && panel.account._id === account._id ? " is-selected" : ""}`} key={account._id} onClick={() => void openUserProfile(account)} aria-label={`Open ${account.name || account.email} profile`}>
                  <span className="pa-admin-management__avatar" aria-hidden="true">{initials}</span>
                  <span className="pa-admin-management__person-copy"><strong>{account.name || "Unnamed user"}</strong><span>{account.email}</span></span>
                  <span className="pa-admin-management__person-meta"><span className="pa-admin-management__badge">{ROLE_LABEL[account.role] || account.role}</span><span className={`pa-admin-management__status pa-admin-management__status--${account.status}`}>{account.status}</span></span>
                  <span className="pa-admin-management__person-last-seen">Last sign-in <strong>{date(account.lastLoginAt)}</strong></span>
                  <span className="pa-admin-management__person-open">Open profile <span aria-hidden="true">→</span></span>
                </button>;
              })}
            </div>}
          </section>
          {panel?.type === "details" && (
            <section className="pa-admin-management__editor pa-admin-management__profile">
              <div className="pa-admin-management__profile-heading"><div><span className="pa-admin-management__eyebrow">TEAM MEMBER PROFILE</span><h3>{panel.account.name || "User"}</h3><p>{panel.account.email} · {ROLE_LABEL[panel.account.role]} · {panel.account.status}</p></div><button type="button" onClick={() => setPanel(null)}>Close profile</button></div>
              <dl className="pa-admin-management__detail-grid">
                <div><dt>Created</dt><dd>{date(panel.account.createdAt)}</dd></div>
                <div><dt>Last sign-in</dt><dd>{date(panel.account.lastLoginAt)}</dd></div>
                <div><dt>Permissions</dt><dd>{panel.account.role === "superadmin" ? "Full access" : `${(panel.account.permissions || []).length} permissions assigned`}</dd></div>
                <div><dt>Account status</dt><dd>{panel.account.status}</dd></div>
              </dl>
              <section className="pa-admin-management__profile-activity" aria-label="Recent activity for this user">
                <div><div><span className="pa-admin-management__eyebrow">AUDIT TRAIL</span><h4>Recent activity</h4></div><button type="button" onClick={() => { setTab("activity"); setActivityFilters({ category: "", actor: panel.account._id, page: 1 }); setPanel(null); }}>View full activity</button></div>
                {profileActivity.loading ? <p role="status">Loading this person’s activity…</p> : profileActivity.error ? <p className="pa-admin-management__feedback pa-admin-management__feedback--error" role="alert">{profileActivity.error}</p> : profileActivity.items.length ? <ul>{profileActivity.items.map((activity) => { const line = describe(activity); return <li key={activity._id}><time>{date(activity.createdAt)}</time><strong className={line.tone ? `pa-admin-management__event--${line.tone}` : ""}>{line.text}</strong>{line.detail && <span>{line.detail}</span>}</li>; })}</ul> : <p>No activity recorded for this person yet.</p>}
              </section>
              {panel.account.role !== "superadmin" && panel.account.status !== "removed" && <section className="pa-admin-management__profile-actions" aria-label="Account actions"><h4>Account actions</h4><div className="pa-admin-management__actions"><select className="pa-admin-management__role" aria-label={`Role for ${panel.account.email}`} value={panel.account.role} disabled={busy} onChange={(e) => { const role = e.target.value; if (window.confirm(`Change ${panel.account.email} to ${ROLE_LABEL[role]}?`)) void perform(() => setAdminRole(panel.account._id, role), `${panel.account.email} is now ${ROLE_LABEL[role]}.`); }}><option value="admin">Admin</option><option value="staff">Staff</option></select><button type="button" disabled={busy} onClick={() => openPanel("permissions", panel.account)}>Permissions</button>{panel.account.status === "active" && <button type="button" onClick={() => openPanel("password", panel.account)}>Set password</button>}{panel.account.status === "active" && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Email a password reset link to ${panel.account.email}?`)) void perform(() => sendAdminPasswordReset(panel.account._id), "Password reset link sent."); }}>Send reset link</button>}<button type="button" disabled={busy} onClick={() => { if (window.confirm(`${panel.account.isActive ? "Deactivate" : "Reactivate"} ${panel.account.email}?`)) void perform(() => setAdminActive(panel.account._id, !panel.account.isActive), panel.account.isActive ? "User deactivated." : "User reactivated."); }}>{panel.account.isActive ? "Deactivate" : "Reactivate"}</button><button type="button" className="pa-admin-management__danger" disabled={busy} onClick={() => { if (window.confirm(`Remove ${panel.account.email}? Their history stays in the activity log.`)) void perform(() => removeAdmin(panel.account._id), "User removed."); }}>Remove</button></div></section>}
            </section>
          )}
          {panel?.type === "permissions" && (
            <section className="pa-admin-management__editor">
              <div><h3>Permissions for {panel.account.email}</h3><p>Changes apply on the user’s next action.</p></div>
              <PermissionSelector value={editPermissions} onChange={setEditPermissions} />
              <div className="pa-admin-management__actions">
                <button type="button" className="pa-admin-management__primary" disabled={busy} onClick={() => void perform(() => updateAdminPermissions(panel.account._id, editPermissions), "Permissions updated.")}>Save permissions</button>
                <button type="button" onClick={() => setPanel(null)}>Cancel</button>
              </div>
            </section>
          )}

          {panel?.type === "password" && (
            <form className="pa-admin-management__editor" onSubmit={submitPassword}>
              <div><h3>Set a new password for {panel.account.email}</h3><p>They will be signed out everywhere and must sign in with the new password.</p></div>
              <div className="pa-admin-management__form-grid">
                <label>New password
                  <span className="pa-admin-management__password">
                    <input required type={showPassword ? "text" : "password"} minLength={MIN_PASSWORD} autoComplete="new-password" value={newPassword.password} onChange={(e) => setNewPassword((v) => ({ ...v, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPassword((s) => !s)}>{showPassword ? "Hide" : "Show"}</button>
                  </span>
                </label>
                <label>Confirm password<input required type={showPassword ? "text" : "password"} minLength={MIN_PASSWORD} autoComplete="new-password" value={newPassword.confirm} onChange={(e) => setNewPassword((v) => ({ ...v, confirm: e.target.value }))} /></label>
                <span className="pa-admin-management__hint">
                  At least {MIN_PASSWORD} characters.{" "}
                  <button type="button" className="pa-admin-management__link" onClick={() => { const p = generatePassword(); setNewPassword({ password: p, confirm: p }); setShowPassword(true); }}>Generate a strong password</button>
                </span>
              </div>
              <div className="pa-admin-management__actions">
                <button type="submit" className="pa-admin-management__primary" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
                <button type="button" onClick={() => setPanel(null)}>Cancel</button>
              </div>
            </form>
          )}
        </>
      )}

      {tab === "activity" && (
        <>
          <div className="pa-admin-management__filters">
            <div className="pa-admin-management__chips" role="group" aria-label="Activity type">
              {CATEGORIES.map(([key, label]) => (
                <button type="button" key={key || "all"} aria-pressed={activityFilters.category === key} onClick={() => setActivityFilters((v) => ({ ...v, category: key, page: 1 }))}>{label}</button>
              ))}
            </div>
            <label>User
              <select value={activityFilters.actor} onChange={(e) => setActivityFilters((v) => ({ ...v, actor: e.target.value, page: 1 }))}>
                <option value="">Everyone</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name || p.email} ({ROLE_LABEL[p.role]})</option>)}
              </select>
            </label>
          </div>
          <div className="pa-admin-management__table-wrap"><table><thead><tr><th>When</th><th>User</th><th>Activity</th><th>Details</th></tr></thead><tbody>
            {loading ? <tr><td colSpan="4">Loading activity…</td></tr> : audit.items.length === 0 ? <tr><td colSpan="4">No activity recorded yet.</td></tr> : audit.items.map((item) => {
              const line = describe(item);
              return (
                <tr key={item._id}>
                  <td>{date(item.createdAt)}</td>
                  <td><strong>{person(item.actorId) || item.metadata?.email || "Unknown"}</strong>{item.actorId?.role && <span>{ROLE_LABEL[item.actorId.role]}</span>}</td>
                  <td><span className={`pa-admin-management__event${line.tone ? ` pa-admin-management__event--${line.tone}` : ""}`}>{line.text}</span></td>
                  <td>{line.detail || "—"}</td>
                </tr>
              );
            })}
          </tbody></table></div>
        </>
      )}

      <footer className="pa-admin-management__pagination">
        <span>{pagination.total ?? 0} records · page {pagination.page || 1}{pagination.pages ? ` of ${pagination.pages}` : ""}</span>
        <div>
          <button type="button" disabled={loading || (pagination.page || 1) <= 1} onClick={() => changePage(-1)}>Previous</button>
          <button type="button" disabled={loading || !pagination.pages || pagination.page >= pagination.pages} onClick={() => changePage(1)}>Next</button>
        </div>
      </footer>
    </section>
  );
}

function PermissionSelector({ value, onChange }) {
  function toggle(permission, selected) {
    onChange(selected ? [...new Set([...value, permission])] : value.filter((current) => current !== permission));
  }

  return (
    <div className="pa-admin-management__permission-grid" aria-label="Permission selection">
      {PERMISSION_MODULES.filter((module) => module.status === "available").map((module) => (
        <fieldset key={module.label}>
          <legend>{module.label}</legend>
          {module.actions.filter((action) => action.permission).map((action) => (
            <label key={action.permission}>
              <input type="checkbox" checked={value.includes(action.permission)} onChange={(event) => toggle(action.permission, event.target.checked)} />
              {action.label}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
