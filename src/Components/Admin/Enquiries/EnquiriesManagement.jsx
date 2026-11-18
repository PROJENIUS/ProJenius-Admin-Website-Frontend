import { useCallback, useEffect, useRef, useState } from "react";
import {
  listAdminEnquiries,
  listAdminJobApplications,
  retryAdminSubmissionEmails,
} from "../../../services/adminContactService";
import EnquiryDetails from "../EnquiryDetails/EnquiryDetails";
import { createRequestSequence } from "../../../utils/requestSequence";
import { hasPermission } from "../../../utils/adminAccess";
import "./EnquiriesManagement.css";

const enquiryTypes = [
  { value: "", label: "All enquiry types" },
  { value: "startup", label: "Startup & Innovation" },
  { value: "development", label: "Development" },
  { value: "workshop", label: "Workshop" },
  { value: "course", label: "Courses & Learning" },
  { value: "internship", label: "Internship" },
  { value: "general", label: "Partnership / General" },
];

const enquiryStatuses = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const careerStatuses = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

function readableLabel(value) {
  return String(value || "—")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "—";
}

function getName(item) {
  return item.answers?.name || item.answers?.fullName || item.answers?.applicantName || "New submission";
}

function getEmail(item) {
  return item.answers?.email || item.answers?.emailAddress || item.answers?.contactEmail || "";
}

export default function EnquiriesManagement({
  admin,
  title = "Contact submissions",
  description = "Review and manage enquiries and career applications received by ProJenius.",
}) {
  const [kind, setKind] = useState(hasPermission(admin, "enquiries:list") ? "enquiry" : "career");
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({ search: "", type: "", status: "", from: "", to: "" });
  const [draftFilters, setDraftFilters] = useState({ type: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [retryingId, setRetryingId] = useState("");
  const requestSequence = useRef(null);
  if (requestSequence.current === null) {
    requestSequence.current = createRequestSequence();
  }

  const loadItems = useCallback(async () => {
    const requestId = requestSequence.current.begin();
    setLoading(true);
    setError("");
    try {
      const list = kind === "career" ? listAdminJobApplications : listAdminEnquiries;
      const result = await list({ ...filters, page, limit: 20 });
      if (!requestSequence.current.isLatest(requestId)) return;
      setItems(result.items || []);
      setPagination(result.pagination || { total: 0, pages: 0, limit: 20 });
    } catch (loadError) {
      if (!requestSequence.current.isLatest(requestId)) return;
      setItems([]);
      setError(loadError.message || "Unable to load contact submissions.");
    } finally {
      if (requestSequence.current.isLatest(requestId)) setLoading(false);
    }
  }, [filters, kind, page]);

  useEffect(() => {
    Promise.resolve().then(loadItems);
    return () => {
      requestSequence.current.invalidate();
    };
  }, [loadItems]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setFilters({ ...draftFilters, search: searchInput.trim() });
  }

  function resetFilters() {
    setSearchInput("");
    const cleared = { search: "", type: "", status: "", from: "", to: "" };
    setDraftFilters({ type: "", status: "", from: "", to: "" });
    setFilters(cleared);
    setPage(1);
  }

  function updateListItem(updated) {
    setItems((current) => current.map((item) =>
      item._id === updated._id ? { ...item, ...updated } : item
    ));
  }

  async function retryEmails(item) {
    if (retryingId) return;
    setRetryingId(item._id);
    setError("");
    try {
      const { item: updated } = await retryAdminSubmissionEmails(kind, item._id);
      updateListItem(updated);
    } catch (retryError) {
      setError(retryError.message || "Email retry failed. Check the mail configuration and try again.");
    } finally {
      setRetryingId("");
    }
  }

  const statuses = kind === "career" ? careerStatuses : enquiryStatuses;

  return (
    <section className="pa-enquiries">
      <header className="pa-enquiries__heading">
        <div>
          <span className="pa-enquiries__eyebrow">CONTACT MANAGEMENT</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="pa-enquiries__count">
          <span>{kind === "career" ? "Career applications" : "Enquiries"}</span>
          <strong>{pagination.total}</strong>
        </div>
      </header>

      <section className="pa-enquiries__panel">
        <div className="pa-enquiries__tabs" role="tablist" aria-label="Contact submission type">
          {hasPermission(admin, "enquiries:list") && <button type="button" role="tab" aria-selected={kind === "enquiry"} className={kind === "enquiry" ? "is-active" : ""} onClick={() => { setKind("enquiry"); setPage(1); setSelected(null); }}>Enquiries</button>}
          {hasPermission(admin, "careerApplications:list") && <button type="button" role="tab" aria-selected={kind === "career"} className={kind === "career" ? "is-active" : ""} onClick={() => { setKind("career"); setPage(1); setSelected(null); }}>Career applications</button>}
          <button type="button" className="pa-enquiries__refresh" onClick={loadItems} disabled={loading}>{loading ? "Refreshing…" : "Refresh list"}</button>
        </div>

        <form className="pa-enquiries__toolbar" onSubmit={applyFilters}>
          <label className="pa-enquiries__search">
            <span>Search</span>
            <input type="search" placeholder="Reference, name, email or message" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          </label>
          {kind === "enquiry" && <label className="pa-enquiries__filter">
            <span>Enquiry type</span>
            <select value={draftFilters.type} onChange={(event) => setDraftFilters((current) => ({ ...current, type: event.target.value }))}>
              {enquiryTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>}
          <label className="pa-enquiries__filter">
            <span>Status</span>
            <select value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))}>
              {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="pa-enquiries__filter pa-enquiries__date-filter"><span>From</span><input type="date" value={draftFilters.from} onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))} /></label>
          <label className="pa-enquiries__filter pa-enquiries__date-filter"><span>To</span><input type="date" value={draftFilters.to} onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))} /></label>
          <div className="pa-enquiries__filter-actions">
            <button className="pa-enquiries__reset" type="submit">Apply filters</button>
            <button className="pa-enquiries__reset" type="button" onClick={resetFilters}>Reset</button>
          </div>
        </form>

        {error && <div className="pa-enquiries__error" role="alert"><span>{error}</span><button type="button" onClick={loadItems}>Retry</button></div>}
        <div className="pa-enquiries__table-wrap">
          <table className="pa-enquiries__table">
            <thead><tr><th>Submission</th><th>Reference</th><th>Type</th><th>Date received</th><th>Status</th><th><span className="pa-enquiries__sr-only">Actions</span></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6}><div className="pa-enquiries__empty" role="status">Loading contact submissions…</div></td></tr>
                : items.length === 0 ? <tr><td colSpan={6}><div className="pa-enquiries__empty"><h2>{error ? "Submissions are unavailable" : "No submissions found"}</h2><p>{error ? "Check the backend connection and try again." : "Try changing the filters or refresh the list."}</p></div></td></tr>
                  : items.map((item) => <tr key={item._id}>
                    <td><strong>{getName(item)}</strong><span>{getEmail(item)}</span></td>
                    <td>{item.referenceNumber}</td>
                    <td>{kind === "career" ? "Career application" : readableLabel(item.enquiryType)}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><span className="pa-enquiries__status">{readableLabel(item.status)}</span>{(item.emailStatus === "failed" || item.customerEmailStatus === "failed" || item.adminEmailStatus === "failed") && <span className="pa-enquiries__email-failed">Email failed</span>}</td>
                    <td className="pa-enquiries__row-actions">{(item.emailStatus === "failed" || item.customerEmailStatus === "failed" || item.adminEmailStatus === "failed") && hasPermission(admin, kind === "career" ? "careerApplications:changeStatus" : "enquiries:changeStatus") && <button type="button" className="pa-enquiries__retry-email" disabled={Boolean(retryingId)} onClick={() => void retryEmails(item)}>{retryingId === item._id ? "Retrying…" : "Retry email"}</button>}{hasPermission(admin, kind === "career" ? "careerApplications:details" : "enquiries:details") && <button type="button" onClick={() => setSelected(item)}>View details</button>}</td>
                  </tr>)}
            </tbody>
          </table>
        </div>

        <footer className="pa-enquiries__footer">
          <span>{pagination.total} total · page {page}{pagination.pages ? ` of ${pagination.pages}` : ""}</span>
          <div className="pa-enquiries__pagination">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <button type="button" disabled={loading || !pagination.pages || page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </footer>
      </section>

      {selected && <EnquiryDetails key={selected._id} admin={admin} kind={kind} record={selected} onClose={() => setSelected(null)} onUpdated={updateListItem} />}
    </section>
  );
}
