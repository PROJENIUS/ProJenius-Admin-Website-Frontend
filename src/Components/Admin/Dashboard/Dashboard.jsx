/* =========================================================
   PROJENIUS ADMIN — DASHBOARD
========================================================= */

import { useEffect, useState } from "react";
import { getAdminDashboardStats } from "../../../services/adminContactService";
import "./Dashboard.css";

const initialStatistics = [
  { label: "Total Enquiries", value: "—", note: "Loading backend total…" },
  { label: "Career Applications", value: "—", note: "Loading backend total…" },
  { label: "Active Courses", value: "—", note: "No statistics endpoint is available" },
  { label: "Registrations", value: "—", note: "No statistics endpoint is available" },
  { label: "Published Articles", value: "—", note: "No statistics endpoint is available" },
];

function readTotal(result) {
  const total = Number(result?.pagination?.total);
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("The backend returned an invalid dashboard count.");
  }
  return total.toLocaleString();
}

export default function Dashboard({ title, description }) {
  const [statistics, setStatistics] = useState(initialStatistics);

  useEffect(() => {
    let active = true;
    getAdminDashboardStats().then((totals) => {
      if (!active) return;
      setStatistics((current) => current.map((item) => {
        if (item.label === "Total Enquiries") {
          return { ...item, value: readTotal({ pagination: { total: totals.enquiries } }), note: "Saved enquiry records" };
        }
        if (item.label === "Career Applications") {
          return { ...item, value: readTotal({ pagination: { total: totals.careerApplications } }), note: "Saved career application records" };
        }
        return item;
      }));
    }).catch(() => {
      if (!active) return;
      setStatistics((current) => current.map((item) =>
        ["Total Enquiries", "Career Applications"].includes(item.label)
          ? { ...item, note: "Could not load; sign in again or retry later" }
          : item
      ));
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="pa-dashboard">
      <section className="pa-dashboard__welcome">
        <span className="pa-dashboard__eyebrow">WORKSPACE OVERVIEW</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className="pa-dashboard__stats" aria-label="Workspace statistics">
        {statistics.map((item) => (
          <article className="pa-dashboard__stat" key={item.label}>
            <span className="pa-dashboard__stat-label">{item.label}</span>
            <strong className="pa-dashboard__stat-value">{item.value}</strong>
            <span className="pa-dashboard__stat-note">{item.note}</span>
          </article>
        ))}
      </section>

      <section className="pa-dashboard__panel">
        <div>
          <h2>Recent activity</h2>
          <p>Open Enquiries to review submissions and their latest status.</p>
        </div>
        <span className="pa-dashboard__activity-icon" aria-hidden="true">↗</span>
      </section>
    </div>
  );
}
