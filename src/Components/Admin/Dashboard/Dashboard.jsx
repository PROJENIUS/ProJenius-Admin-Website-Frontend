/* =========================================================
   PROJENIUS ADMIN — DASHBOARD (summary only)
   The few numbers that matter, with colour and motion.
   Every card links to its page, where the full details live.
========================================================= */

import { useEffect, useMemo, useRef, useState } from "react";
import { clearDashboardNotifications, getAdminDashboard } from "../../../services/courseManagementService";
import "./Dashboard.css";

const inr = (minor) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((minor || 0) / 100);
const shortInr = (minor) => {
  const r = (minor || 0) / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(r >= 1e4 ? 0 : 1)}k`;
  return `₹${Math.round(r)}`;
};
const mShort = (key) => new Date(`${key}-01T00:00:00`).toLocaleString("en-IN", { month: "short" });
const mLong = (key) => new Date(`${key}-01T00:00:00`).toLocaleString("en-IN", { month: "long", year: "numeric" });
const day = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
const ago = (v) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(v).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
};
const TYPE_LABEL = { startup: "Startup", development: "Development", workshop: "Workshop", course: "Course", internship: "Internship", general: "General" };
const TYPE_COLOR = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const STATUS = { ongoing: "Ongoing", upcoming: "Upcoming", ended: "Ended", cancelled: "Cancelled", not_scheduled: "No date" };
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ---------- small inline icons (no icon library in the admin) ---------- */
const I = {
  rupee: "M6 4h12M6 9h12M9 4c4 0 6 2 6 5s-2 5-6 5H6l8 7",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7M22 21v-1a6 6 0 0 0-4-5.6",
  cart: "M3 4h2l2.5 11h11L21 8H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  brief: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  arrow: "M5 12h14M13 6l6 6-6 6",
};
const Icon = ({ d, size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/* Count-up number */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(reduceMotion() ? target : 0);
  useEffect(() => {
    if (reduceMotion()) { setValue(target); return undefined; }
    let frame; const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * (1 - (1 - p) ** 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export default function Dashboard({ admin, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function clearAll() {
    if (clearing) return;
    setClearing(true);
    try {
      await clearDashboardNotifications();
      setData((current) => current && { ...current, notifications: [] });
    } catch (e) {
      setError(e.message || "Notifications could not be cleared.");
    } finally {
      setClearing(false);
    }
  }
  const bellRef = useRef(null);

  useEffect(() => {
    let active = true;
    getAdminDashboard()
      .then((result) => { if (active) { setData(result.item); setError(""); } })
      .catch((e) => { if (active) setError(e.message || "The dashboard could not be loaded."); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (!bellOpen) return undefined;
    const close = (e) => { if (!bellRef.current?.contains(e.target)) setBellOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setBellOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [bellOpen]);

  const go = (path) => onNavigate?.(path);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = String(admin?.name || "").split(/\s+/)[0];
  const notes = data?.notifications || [];

  return (
    <div className="pdx">
      {/* ===== Hero ===== */}
      <header className="pdx-hero">
        <div className="pdx-hero__glow" aria-hidden="true" />
        <div className="pdx-hero__text">
          <span className="pdx-hero__eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
          <h1>{greet}{firstName && firstName.length < 20 ? `, ${firstName}` : ""}</h1>
          <p>{data ? summaryLine(data) : "Loading today’s summary…"}</p>
        </div>
        <div className="pdx-hero__actions">
          <div className="pdx-bell" ref={bellRef}>
            <button type="button" className={`pdx-bell__btn${notes.length ? " has-new" : ""}`} aria-expanded={bellOpen} aria-haspopup="true" aria-label={`Notifications, ${notes.length} new`} onClick={() => setBellOpen((v) => !v)}>
              <Icon d={I.bell} />{notes.length > 0 && <span className="pdx-bell__count">{notes.length}</span>}
            </button>
            {bellOpen && (
              <div className="pdx-bell__panel" role="dialog" aria-label="New notifications">
                <div className="pdx-bell__head">
                  <strong>New for you</strong>
                  {notes.length > 0 && <button type="button" className="pdx-bell__clear" onClick={() => void clearAll()} disabled={clearing}>{clearing ? "Clearing…" : "Clear all"}</button>}
                </div>
                {notes.length === 0 ? <p className="pdx-empty">You’re all caught up.</p> : (
                  <ul>{notes.map((n, i) => (
                    <li key={`${n.reference}-${i}`}><button type="button" onClick={() => { setBellOpen(false); go(n.kind === "enrolment" ? "/courses" : n.kind === "guidance" ? "/career-guidance" : "/enquiries"); }}>
                      <span className={`pdx-dot is-${n.kind}`} aria-hidden="true" />
                      <span><b>{n.title}</b><small>{n.who} · {ago(n.at)}</small></span>
                    </button></li>
                  ))}</ul>
                )}
              </div>
            )}
          </div>
          <button type="button" className="pdx-refresh" onClick={() => setReload((n) => n + 1)} aria-label="Refresh dashboard"><Icon d={I.refresh} size={18} /></button>
        </div>
      </header>

      {error && <p className="pdx-error" role="alert">{error} <button type="button" onClick={() => setReload((n) => n + 1)}>Try again</button></p>}
      {!data && !error && <div className="pdx-skeleton" aria-label="Loading">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>}

      {data && <DashboardBody data={data} go={go} notes={notes} />}
    </div>
  );
}

function summaryLine(d) {
  const parts = [];
  if (d.enquiries?.new) parts.push(`${d.enquiries.new} new ${d.enquiries.new === 1 ? "enquiry" : "enquiries"}`);
  if (d.totals.enrolledThisMonth) parts.push(`${d.totals.enrolledThisMonth} ${d.totals.enrolledThisMonth === 1 ? "enrolment" : "enrolments"} this month`);
  if (d.canSeeMoney && d.monthly.at(-1)?.receivedMinor) parts.push(`${inr(d.monthly.at(-1).receivedMinor)} received this month`);
  return parts.length ? `${parts.join(" · ")}.` : "No new activity yet today.";
}

function DashboardBody({ data, go, notes }) {
  const m = data.monthly;
  const thisMonth = m.at(-1) || {};
  const lastMonth = m.at(-2) || {};
  const cards = [
    data.canSeeMoney && { key: "money", tone: "cyan", icon: I.rupee, label: "Amount received", value: data.totals.receivedMinor, format: inr, sub: `${inr(thisMonth.receivedMinor)} this month`, trend: trend(thisMonth.receivedMinor, lastMonth.receivedMinor), spark: m.map((x) => x.receivedMinor), to: "/courses" },
    data.enquiries && { key: "enq", tone: "violet", icon: I.mail, label: "Enquiries", value: data.enquiries.total, sub: `${data.enquiries.lastWeek} in the last 7 days`, trend: trend(thisMonth.enquiries, lastMonth.enquiries), spark: m.map((x) => x.enquiries || 0), to: "/enquiries" },
    data.enquiries && { key: "new", tone: "amber", icon: I.bell, label: "New, not answered", value: data.enquiries.new, sub: `${data.enquiries.inProgress} in progress · ${data.enquiries.resolved} resolved`, pulse: data.enquiries.new > 0, to: "/enquiries" },
    { key: "enrol", tone: "green", icon: I.users, label: "Enrolments", value: data.totals.enrolled, sub: `${data.totals.enrolledThisMonth} this month`, trend: trend(thisMonth.enrolments, lastMonth.enrolments), spark: m.map((x) => x.enrolments), to: "/courses" },
    { key: "orders", tone: "blue", icon: I.cart, label: "Orders (12 months)", value: data.orders.paid, sub: `${data.orders.failed} failed · ${data.orders.pending} not completed`, to: "/courses" },
    data.careers && { key: "careers", tone: "pink", icon: I.brief, label: "Career applications", value: data.careers.total, sub: `${data.careers.new} new · ${data.careers.shortlisted} shortlisted`, to: "/enquiries" },
  ].filter(Boolean);

  return <>
    <section className="pdx-cards" aria-label="Key numbers">
      {cards.map((card, i) => <StatCard key={card.key} card={card} index={i} onOpen={() => go(card.to)} />)}
    </section>

    <div className="pdx-grid">
      {data.canSeeMoney && <MoneyChart monthly={m} refundedMinor={data.totals.refundedMinor} refunds={data.totals.refundsProcessed} />}
      {data.enquiries && <TypeDonut types={data.enquiries.byType} onOpen={() => go("/enquiries")} />}
      <ActivityBars monthly={m} showEnquiries={Boolean(data.enquiries)} />
      <OrdersRing orders={data.orders} />
    </div>

    <div className="pdx-grid pdx-grid--lists">
      <Panel title="Needs your attention" action="Open enquiries" onAction={() => go("/enquiries")}>
        {notes.length === 0 ? <p className="pdx-empty">Nothing new. You’re all caught up.</p> : (
          <ul className="pdx-feed">{notes.slice(0, 5).map((n, i) => (
            <li key={`${n.reference}-${i}`} style={{ "--i": i }}>
              <span className={`pdx-dot is-${n.kind}`} aria-hidden="true" />
              <span><b>{n.title}</b><small>{n.who} · {n.reference}</small></span>
              <time>{ago(n.at)}</time>
            </li>
          ))}</ul>
        )}
      </Panel>
      <Panel title="Classes" action="Open courses" onAction={() => go("/courses")}>
        {data.classes.length === 0 ? <p className="pdx-empty">No published courses with dates yet.</p> : (
          <ul className="pdx-classes">{data.classes.slice(0, 5).map((c, i) => (
            <li key={`${c.course}-${i}`} style={{ "--i": i }}>
              <span><b>{c.course}</b><small>{c.batch || "Main batch"} · {day(c.startsAt)} → {day(c.endsAt)}</small></span>
              <em className={`pdx-pill is-${c.status}`}>{STATUS[c.status] || c.status}</em>
            </li>
          ))}</ul>
        )}
      </Panel>
    </div>
  </>;
}

const trend = (now = 0, before = 0) => (before ? Math.round(((now - before) / before) * 100) : now ? 100 : 0);

function StatCard({ card, index, onOpen }) {
  const n = useCountUp(Number(card.value) || 0);
  const shown = card.format ? card.format(n) : Math.round(n).toLocaleString("en-IN");
  return (
    <button type="button" className={`pdx-card is-${card.tone}${card.pulse ? " is-pulse" : ""}`} style={{ "--i": index }} onClick={onOpen}>
      <span className="pdx-card__top"><span className="pdx-card__icon"><Icon d={card.icon} /></span>
        {card.trend !== undefined && card.trend !== 0 && <span className={`pdx-trend ${card.trend > 0 ? "is-up" : "is-down"}`} title="This month compared with last month">{card.trend > 0 ? "▲" : "▼"} {Math.abs(card.trend)}%</span>}
      </span>
      <span className="pdx-card__label">{card.label}</span>
      <strong className="pdx-card__value">{shown}</strong>
      <span className="pdx-card__sub">{card.sub}</span>
      {card.spark && <Spark values={card.spark} />}
      <span className="pdx-card__go" aria-hidden="true"><Icon d={I.arrow} size={16} /></span>
    </button>
  );
}

function Spark({ values }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  return <svg className="pdx-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points={`0,30 ${pts} 100,30`} className="pdx-spark__fill" /><polyline points={pts} className="pdx-spark__line" pathLength="1" /></svg>;
}

function Panel({ title, action, onAction, children, className = "" }) {
  return (
    <section className={`pdx-panel ${className}`}>
      <header><h2>{title}</h2>{action && <button type="button" className="pdx-link" onClick={onAction}>{action} →</button>}</header>
      {children}
    </section>
  );
}

/* Area chart: amount received per month */
function MoneyChart({ monthly, refundedMinor, refunds }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 230, L = 50, B = 26, T = 14;
  const max = niceMax(Math.max(1, ...monthly.map((x) => x.receivedMinor)));
  const x = (i) => L + (i / (monthly.length - 1)) * (W - L - 12);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const line = monthly.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.receivedMinor)}`).join(" ");
  const area = `${line} L${x(monthly.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  return (
    <Panel title="Amount received per month" className="pdx-panel--wide">
      <p className="pdx-panel__meta">Refunded: <b>{inr(refundedMinor)}</b> ({refunds} {refunds === 1 ? "refund" : "refunds"})</p>
      <div className="pdx-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Amount received per month for the last 12 months">
          <defs><linearGradient id="pdxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20c8f5" stopOpacity="0.45" /><stop offset="100%" stopColor="#20c8f5" stopOpacity="0" /></linearGradient></defs>
          {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - 8} y1={y(max * f)} y2={y(max * f)} className="pdx-gridline" /><text x={L - 8} y={y(max * f) + 4} textAnchor="end" className="pdx-axis">{shortInr(max * f)}</text></g>)}
          <path d={area} fill="url(#pdxArea)" className="pdx-area" />
          <path d={line} className="pdx-line" pathLength="1" />
          {monthly.map((d, i) => <g key={d.month}>
            <text x={x(i)} y={H - 6} textAnchor="middle" className="pdx-axis">{mShort(d.month)}</text>
            <rect x={x(i) - (W - L) / monthly.length / 2} y={T} width={(W - L) / monthly.length} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>)}
          {hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1={T} y2={y(0)} className="pdx-cross" /><circle cx={x(hover)} cy={y(monthly[hover].receivedMinor)} r="6" className="pdx-point" /></g>}
        </svg>
        {hover !== null && <div className="pdx-tip" style={{ left: `${(x(hover) / W) * 100}%` }}><b>{mLong(monthly[hover].month)}</b><span>Received {inr(monthly[hover].receivedMinor)}</span>{monthly[hover].refundedMinor > 0 && <span>Refunded {inr(monthly[hover].refundedMinor)}</span>}</div>}
      </div>
    </Panel>
  );
}

/* Donut: enquiries by type (last 12 months) */
function TypeDonut({ types, onOpen }) {
  const total = types.reduce((n, t) => n + t.count, 0);
  const [active, setActive] = useState(null);
  const R = 52, C = 2 * Math.PI * R;
  const order = Object.keys(TYPE_LABEL);
  const segs = useMemo(() => {
    let acc = 0;
    return types.map((t) => {
      const len = total ? (t.count / total) * C : 0;
      const seg = { ...t, color: TYPE_COLOR[order.indexOf(t.type) % TYPE_COLOR.length] || "#7a8699", len, offset: acc };
      acc += len;
      return seg;
    });
  }, [types, total, C]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = active !== null ? segs[active] : null;
  return (
    <Panel title="Enquiries by type" action="View" onAction={onOpen}>
      {total === 0 ? <p className="pdx-empty">No enquiries in the last 12 months.</p> : (
        <div className="pdx-donut">
          <svg viewBox="0 0 140 140" role="img" aria-label={`Enquiries by type: ${segs.map((s) => `${TYPE_LABEL[s.type] || s.type} ${s.count}`).join(", ")}`}>
            <circle cx="70" cy="70" r={R} className="pdx-donut__track" />
            {segs.map((s, i) => (
              <circle key={s.type} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth={active === i ? 20 : 16}
                strokeDasharray={`${Math.max(0, s.len - 2)} ${C}`} strokeDashoffset={-s.offset} transform="rotate(-90 70 70)"
                className="pdx-donut__seg" style={{ "--i": i }} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
            ))}
            <text x="70" y="66" textAnchor="middle" className="pdx-donut__num">{shown ? shown.count : total}</text>
            <text x="70" y="84" textAnchor="middle" className="pdx-donut__cap">{shown ? (TYPE_LABEL[shown.type] || shown.type) : "enquiries"}</text>
          </svg>
          <ul className="pdx-legend">{segs.map((s, i) => (
            <li key={s.type} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={active === i ? "is-on" : ""}>
              <i style={{ background: s.color }} /><span>{TYPE_LABEL[s.type] || s.type}</span><b>{s.count}</b>
            </li>
          ))}</ul>
        </div>
      )}
    </Panel>
  );
}

/* Grouped bars: enquiries and enrolments per month (both are counts) */
function ActivityBars({ monthly, showEnquiries }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 220, L = 34, B = 26, T = 12;
  const max = niceMax(Math.max(1, ...monthly.map((d) => Math.max(d.enrolments, d.enquiries || 0))), true);
  const slot = (W - L - 8) / monthly.length;
  const n = showEnquiries ? 2 : 1;
  const bw = Math.min(14, (slot - 8) / n);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const series = [showEnquiries && ["enquiries", "Enquiries", "#7c5cdb"], ["enrolments", "Enrolments", "#1baf7a"]].filter(Boolean);
  return (
    <Panel title="Enquiries & enrolments per month" className="pdx-panel--wide">
      <ul className="pdx-legend pdx-legend--row">{series.map(([k, label, color]) => <li key={k}><i style={{ background: color }} /><span>{label}</span></li>)}</ul>
      <div className="pdx-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Enquiries and enrolments per month">
          {[0, max / 2, max].map((v) => <g key={v}><line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} className="pdx-gridline" /><text x={L - 8} y={y(v) + 4} textAnchor="end" className="pdx-axis">{Math.round(v)}</text></g>)}
          {monthly.map((d, i) => {
            const x0 = L + i * slot + (slot - (bw * n + 2 * (n - 1))) / 2;
            return <g key={d.month} onMouseEnter={() => setHover(i)}>
              <rect x={L + i * slot} y={T} width={slot} height={H - T - B} className={hover === i ? "pdx-hit is-on" : "pdx-hit"} />
              {series.map(([k, , color], j) => <Bar key={k} x={x0 + j * (bw + 2)} w={bw} top={y(d[k] || 0)} base={y(0)} color={color} delay={i * 40 + j * 20} />)}
              <text x={L + i * slot + slot / 2} y={H - 6} textAnchor="middle" className="pdx-axis">{mShort(d.month)}</text>
            </g>;
          })}
        </svg>
        {hover !== null && <div className="pdx-tip" style={{ left: `${((L + hover * slot + slot / 2) / W) * 100}%` }}><b>{mLong(monthly[hover].month)}</b>{series.map(([k, label]) => <span key={k}>{label}: {monthly[hover][k] || 0}</span>)}</div>}
      </div>
    </Panel>
  );
}

function Bar({ x, w, top, base, color, delay }) {
  const h = base - top;
  if (h <= 0.5) return null;
  const r = Math.min(4, h, w / 2);
  return <path className="pdx-bar" style={{ "--d": `${delay}ms`, transformOrigin: `0 ${base}px` }} fill={color}
    d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`} />;
}

/* Ring: payment orders by outcome (status colours + labels) */
function OrdersRing({ orders }) {
  const rows = [["Paid", orders.paid, "#11795a"], ["Not completed", orders.pending, "#c98500"], ["Failed", orders.failed, "#c0392b"]];
  const total = rows.reduce((n, r) => n + r[1], 0);
  const rate = total ? Math.round((orders.paid / total) * 100) : 0;
  return (
    <Panel title="Orders (last 12 months)">
      {total === 0 ? <p className="pdx-empty">No checkout attempts yet.</p> : (
        <div className="pdx-orders">
          <div className="pdx-orders__rate" style={{ "--p": rate }}><span><b>{rate}%</b><small>paid</small></span></div>
          <ul>{rows.map(([label, value, color]) => (
            <li key={label}><span><i style={{ background: color }} />{label}</span><b>{value}</b>
              <em className="pdx-orders__bar"><span style={{ width: `${total ? (value / total) * 100 : 0}%`, background: color }} /></em></li>
          ))}</ul>
        </div>
      )}
    </Panel>
  );
}

function niceMax(value, integer = false) {
  const exp = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= value) * exp;
  return integer ? Math.max(4, Math.ceil(step / 2) * 2) : step;
}
