/* =========================================================
   JOB OPENINGS — ADMIN
   Roles shown on the website's Join Our Team page. "Open"
   roles are public until their closing date; drafts and
   closed roles are hidden. Applications for a role arrive in
   Enquiries → Career applications with the role name.
========================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createOpening, deleteOpening, listOpenings, updateOpening } from "../../../services/careersService";
import "./CareersManagement.css";

const STATUS_LABEL = { draft: "Draft", open: "Open", closed: "Closed" };
const LIST_HELP = {
  responsibilities: "One point per line, e.g. “Build React interfaces for client dashboards”.",
  requirements: "One point per line: skills, education or experience you need.",
  niceToHave: "One point per line. Leave empty if none.",
  benefits: "One point per line, e.g. “Mentoring from senior engineers”.",
  skills: "One skill per line, shown as tags (React, Node.js, ESP32…).",
};

const BLANK = {
  title: "", department: "Software", employmentType: "Full-time", workMode: "On-site", location: "Madurai, Tamil Nadu",
  experience: "", salary: "", positions: 1, summary: "", responsibilities: "", requirements: "", niceToHave: "", benefits: "", skills: "",
  status: "draft", closesOn: "",
};

const toLines = (items) => (items || []).join("\n");
const fromLines = (text) => String(text || "").split("\n").map((line) => line.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
const toForm = (item) => ({ ...BLANK, ...item, responsibilities: toLines(item.responsibilities), requirements: toLines(item.requirements), niceToHave: toLines(item.niceToHave), benefits: toLines(item.benefits), skills: toLines(item.skills), closesOn: item.closesOn ? item.closesOn.slice(0, 10) : "" });
const toPayload = (form) => ({
  title: form.title, department: form.department, employmentType: form.employmentType, workMode: form.workMode, location: form.location,
  experience: form.experience, salary: form.salary, positions: Number(form.positions), summary: form.summary,
  responsibilities: fromLines(form.responsibilities), requirements: fromLines(form.requirements), niceToHave: fromLines(form.niceToHave),
  benefits: fromLines(form.benefits), skills: fromLines(form.skills), status: form.status, closesOn: form.closesOn || "",
  ...(form.updatedAt ? { updatedAt: form.updatedAt } : {}),
});

function problemsFor(form, rules) {
  if (!rules) return {};
  const problems = {};
  for (const [name, rule] of Object.entries(rules.text)) {
    const length = String(form[name] || "").trim().length;
    if (length < rule.min || length > rule.max) problems[name] = `${rule.label}: ${rule.min ? `${rule.min}–` : "up to "}${rule.max} characters (now ${length}).`;
  }
  for (const [name, rule] of Object.entries(rules.lists)) {
    const items = fromLines(form[name]);
    if (items.length < rule.min || items.length > rule.max) problems[name] = `${rule.label}: ${rule.min ? `${rule.min}–${rule.max}` : `up to ${rule.max}`} points (now ${items.length}).`;
    else if (items.some((item) => item.length > rule.itemMax)) problems[name] = `${rule.label}: keep each point under ${rule.itemMax} characters.`;
  }
  const positions = Number(form.positions);
  if (!Number.isInteger(positions) || positions < rules.positions.min || positions > rules.positions.max) problems.positions = `Openings: ${rules.positions.min}–${rules.positions.max}.`;
  return problems;
}

function Count({ value, rule }) {
  const length = String(value || "").trim().length;
  return <span className={`pa-careers__count${length > rule.max || (length && length < rule.min) ? " is-bad" : ""}`}>{length}/{rule.max}</span>;
}

export default function CareersManagement({ canEdit }) {
  const [items, setItems] = useState([]);
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });

  const load = useCallback(async () => {
    const data = await listOpenings();
    setItems(data.items);
    setRules(data.rules);
  }, []);

  useEffect(() => {
    let active = true;
    listOpenings().then((data) => { if (active) { setItems(data.items); setRules(data.rules); } }).catch((error) => { if (active) setMessage({ tone: "bad", text: error.message }); });
    return () => { active = false; };
  }, []);

  const problems = useMemo(() => (form ? problemsFor(form, rules) : {}), [form, rules]);
  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  async function save() {
    if (Object.keys(problems).length) return;
    if (form.status === "open" && !window.confirm("This role will be visible on the website. Publish it?")) return;
    setBusy(true);
    try {
      if (form.id) await updateOpening(form.id, toPayload(form));
      else await createOpening(toPayload(form));
      await load();
      setForm(null);
      setMessage({ tone: "good", text: form.status === "open" ? "Saved. The role is live on Join Our Team." : "Saved." });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone. Its applications stay in Enquiries.`)) return;
    setBusy(true);
    try {
      await deleteOpening(item.id);
      await load();
      setMessage({ tone: "good", text: "Role deleted." });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  if (form && rules) {
    const field = (name, label, extra = {}) => (
      <label className="pa-careers__field">
        <span className="pa-careers__label">{label}{rules.text[name] && <Count value={form[name]} rule={rules.text[name]} />}</span>
        {extra.multiline
          ? <textarea rows={extra.rows || 3} value={form[name]} onChange={set(name)} aria-invalid={Boolean(problems[name])} />
          : <input value={form[name]} onChange={set(name)} aria-invalid={Boolean(problems[name])} placeholder={extra.placeholder} list={extra.list} />}
        {problems[name] ? <small className="is-bad">{problems[name]}</small> : extra.help && <small>{extra.help}</small>}
      </label>
    );
    return (
      <section className="pa-careers" aria-label={form.id ? "Edit role" : "New role"}>
        <header className="pa-careers__bar">
          <div><h2>{form.id ? `Edit · ${form.title || "role"}` : "New role"}</h2><p>{form.slug ? `Website link: /join-our-team/${form.slug}` : "The website link is made from the title when you first save."}</p></div>
          <div className="pa-careers__actions">
            <button type="button" className="pa-careers__secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            {canEdit && <button type="button" className="pa-careers__primary" onClick={save} disabled={busy || Object.keys(problems).length > 0}>Save</button>}
          </div>
        </header>
        {message.text && <p className={`pa-careers__status is-${message.tone}`} role="status">{message.text}</p>}
        <fieldset className="pa-careers__form" disabled={!canEdit || busy}>
          <div className="pa-careers__grid">
            {field("title", "Job title", { placeholder: "Full Stack Developer" })}
            {field("department", "Team", { list: "pa-careers-departments", help: "Shown as a filter on the website." })}
            <datalist id="pa-careers-departments">{rules.departments.map((name) => <option key={name} value={name} />)}</datalist>
            <label className="pa-careers__field"><span className="pa-careers__label">Job type</span><select value={form.employmentType} onChange={set("employmentType")}>{rules.employmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="pa-careers__field"><span className="pa-careers__label">Work mode</span><select value={form.workMode} onChange={set("workMode")}>{rules.workModes.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
            {field("location", "Location")}
            {field("experience", "Experience", { placeholder: "0–2 years / Freshers welcome" })}
            {field("salary", "Salary (optional)", { placeholder: "₹3–5 LPA", help: "Leave empty to show “Not disclosed”." })}
            <label className="pa-careers__field"><span className="pa-careers__label">Openings</span><input type="number" min={rules.positions.min} max={rules.positions.max} value={form.positions} onChange={set("positions")} />{problems.positions && <small className="is-bad">{problems.positions}</small>}</label>
          </div>
          {field("summary", "Short summary", { multiline: true, help: "Shown on the role card and in Google job results. One or two sentences." })}
          {Object.keys(LIST_HELP).map((name) => (
            <label key={name} className="pa-careers__field">
              <span className="pa-careers__label">{rules.lists[name].label}<span className="pa-careers__count">{fromLines(form[name]).length}/{rules.lists[name].max}</span></span>
              <textarea rows={name === "skills" ? 3 : 5} value={form[name]} onChange={set(name)} aria-invalid={Boolean(problems[name])} />
              {problems[name] ? <small className="is-bad">{problems[name]}</small> : <small>{LIST_HELP[name]}</small>}
            </label>
          ))}
          <div className="pa-careers__grid">
            <label className="pa-careers__field"><span className="pa-careers__label">Status</span><select value={form.status} onChange={set("status")}>{rules.statuses.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select><small>Open = visible on the website. Closed = hidden, keeps its applications.</small></label>
            <label className="pa-careers__field"><span className="pa-careers__label">Closing date (optional)</span><input type="date" value={form.closesOn} onChange={set("closesOn")} /><small>The role hides itself after this date.</small></label>
          </div>
        </fieldset>
      </section>
    );
  }

  return (
    <section className="pa-careers" aria-labelledby="pa-careers-title">
      <header className="pa-careers__bar">
        <div><h2 id="pa-careers-title">Job openings</h2><p>Roles on the website's Join Our Team page. Applications arrive in Enquiries → Career applications.</p></div>
        {canEdit && <button type="button" className="pa-careers__primary" onClick={() => setForm({ ...BLANK })}>+ New role</button>}
      </header>
      {message.text && <p className={`pa-careers__status is-${message.tone}`} role="status">{message.text}</p>}
      <div className="pa-careers__table-wrap">
        <table className="pa-careers__table">
          <thead><tr><th>Role</th><th>Type</th><th>Status</th><th>Applications</th><th>Posted</th><th>Closes</th><th><span className="pa-careers__sr">Actions</span></th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={7} className="pa-careers__empty">No roles yet. The website shows “No open roles right now” and still takes general applications.</td></tr>}
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong><small>{item.department} · {item.location}</small></td>
                <td>{item.employmentType}<small>{item.workMode}</small></td>
                <td><span className={`pa-careers__pill is-${item.status}`}>{STATUS_LABEL[item.status]}</span></td>
                <td>{item.applications}</td>
                <td>{item.postedAt ? new Date(item.postedAt).toLocaleDateString("en-IN") : "—"}</td>
                <td>{item.closesOn ? new Date(item.closesOn).toLocaleDateString("en-IN") : "—"}</td>
                <td className="pa-careers__row-actions">
                  <button type="button" onClick={() => setForm(toForm(item))}>{canEdit ? "Edit" : "View"}</button>
                  {canEdit && item.status !== "open" && <button type="button" onClick={() => remove(item)} disabled={busy}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
