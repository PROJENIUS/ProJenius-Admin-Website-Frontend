import { useEffect, useState } from "react";
import {
  downloadAdminSubmissionFile,
  getAdminEnquiry,
  getAdminJobApplication,
  updateAdminSubmissionStatus,
} from "../../../services/adminContactService";
import "./EnquiryDetails.css";
import { hasPermission } from "../../../utils/adminAccess";

const regularStatuses = ["new", "in_progress", "resolved", "closed"];
const careerStatuses = ["new", "reviewing", "shortlisted", "rejected", "hired"];

function readableLabel(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value) {
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, child]) => `${readableLabel(key)}: ${displayValue(child)}`)
      .join(" · ");
  }
  return String(value ?? "—");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function getEmailStatus(item, field) {
  if (item[field]) return readableLabel(item[field]);
  if (item.emailStatus === "failed") return "Unknown (legacy failure)";
  return readableLabel(item.emailStatus || "pending");
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function EnquiryDetails({ admin, kind, record, onClose, onUpdated }) {
  const [item, setItem] = useState(record);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = kind === "career" ? getAdminJobApplication : getAdminEnquiry;
    load(record._id || record.id)
      .then(({ item: fullRecord }) => {
        if (active) setItem(fullRecord);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [kind, record._id, record.id]);

  async function handleStatusChange(event) {
    const status = event.target.value;
    setSaving(true);
    setError("");
    try {
      const { item: updated } = await updateAdminSubmissionStatus(
        kind,
        item._id,
        status
      );
      setItem((current) => ({ ...current, ...updated }));
      onUpdated(updated);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(fileKind) {
    setError("");
    try {
      const blob = await downloadAdminSubmissionFile(kind, item._id, fileKind);
      const filename = fileKind === "receipt"
        ? `ProJenius-${item.referenceNumber}.pdf`
        : item.resume?.originalName || item.attachment?.originalName || "submission-file";
      triggerDownload(blob, filename);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  const statuses = kind === "career" ? careerStatuses : regularStatuses;
  const attachment = kind === "career" ? item.resume : item.attachment;
  const permissionPrefix = kind === "career" ? "careerApplications" : "enquiries";

  return (
    <div className="pa-contact-detail__backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="pa-contact-detail" role="dialog" aria-modal="true" aria-labelledby="pa-contact-detail-title">
        <header className="pa-contact-detail__header">
          <div>
            <span>CONTACT SUBMISSION</span>
            <h2 id="pa-contact-detail-title">{item.referenceNumber || "Submission details"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details">×</button>
        </header>

        {loading ? (
          <p className="pa-contact-detail__state" role="status">Loading submission details…</p>
        ) : error && !item.answers ? (
          <p className="pa-contact-detail__state pa-contact-detail__error" role="alert">{error}</p>
        ) : (
          <>
            {error && <p className="pa-contact-detail__error" role="alert">{error}</p>}
            <div className="pa-contact-detail__controls">
              <label>
                Work status
                <select value={item.status || "new"} onChange={handleStatusChange} disabled={saving || !hasPermission(admin, `${permissionPrefix}:changeStatus`)}>
                  {statuses.map((status) => <option key={status} value={status}>{readableLabel(status)}</option>)}
                </select>
              </label>
              <div className="pa-contact-detail__email-status">
                <span>Customer email <strong>{getEmailStatus(item, "customerEmailStatus")}</strong></span>
                <span>Administrator email <strong>{getEmailStatus(item, "adminEmailStatus")}</strong></span>
              </div>
            </div>

            <dl className="pa-contact-detail__meta">
              <div><dt>Category</dt><dd>{readableLabel(item.enquiryType || "career")}</dd></div>
              <div><dt>Received</dt><dd>{formatDate(item.createdAt)}</dd></div>
              <div><dt>Reference</dt><dd>{item.referenceNumber}</dd></div>
            </dl>

            <section className="pa-contact-detail__answers" aria-label="Submitted information">
              <h3>Submitted information</h3>
              {Object.entries(item.answers || {}).map(([key, value]) => (
                <div className="pa-contact-detail__answer" key={key}>
                  <strong>{readableLabel(key)}</strong>
                  <p>{displayValue(value)}</p>
                </div>
              ))}
            </section>

            <footer className="pa-contact-detail__files">
              {hasPermission(admin, `${permissionPrefix}:download`) && <button type="button" onClick={() => handleDownload("receipt")}>Download PDF receipt</button>}
              {hasPermission(admin, `${permissionPrefix}:download`) && attachment?.originalName && (
                <button type="button" onClick={() => handleDownload("attachment")}>
                  Download {kind === "career" ? "resume" : "attachment"}
                </button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
