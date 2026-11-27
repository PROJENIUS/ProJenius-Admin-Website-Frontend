/* =========================================================
   PAGE HEROES — EDITOR
   One editor for the hero of every editable page. The form is
   built from the page's schema (sent by the API); the preview
   is the real website page in a frame (/hero-preview/:key),
   which receives the unsaved draft by postMessage. Nothing
   reaches the website until "Save and publish".
   "Home" is the first page in the list and opens the Home Hero
   slide editor (HomeHeroManagement) in the same place.
========================================================= */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPageHero, heroPreviewUrl, listPageHeroes, pageHeroMediaUrl, PUBLIC_SITE_ORIGIN, resetPageHero, savePageHero, uploadPageHeroImage } from "../../../services/pageHeroService";
import { tidy } from "../../../utils/homeHeroForm";
import { fromDefaults, heroProblems, imageSizeProblem, toPayload, uploadedImages, withDefaultImages } from "../../../utils/pageHeroForm";
import useFitScale from "../../../utils/useFitScale";
import HomeHeroManagement from "../HomeHero/HomeHeroManagement";
import "./PageHeroesManagement.css";

const HOME = { key: "home", label: "Home", path: "/", home: true };
const DEVICES = { desktop: { width: 1440, height: 900, label: "Desktop" }, mobile: { width: 390, height: 844, label: "Phone" } };

function Counter({ value, min = 0, max }) {
  const length = tidy(value).length;
  const state = length > max || (length > 0 && length < min) ? " is-bad" : length > max * 0.9 ? " is-near" : "";
  return <span className={`pa-page-hero__count${state}`}>{length}/{max}</span>;
}

function Problem({ text, help }) {
  if (text) return <small className="is-bad">{text}</small>;
  return help ? <small>{help}</small> : null;
}

/* ---------- one field, by type ---------- */
function Field({ field, value, path, problems, onChange, links, ctaLabel, imageUrl, onUpload, busy }) {
  const id = `ph-${path.replace(/\./g, "-")}`;
  if (field.type === "text") {
    const Tag = field.multiline ? "textarea" : "input";
    return (
      <div className="pa-page-hero__field">
        <div className="pa-page-hero__label-row"><label htmlFor={id}>{field.label}</label><Counter value={value} min={field.min} max={field.max} /></div>
        <Tag id={id} value={value || ""} rows={field.multiline ? 3 : undefined} maxLength={field.max + 20} aria-invalid={Boolean(problems[path])} onChange={(event) => onChange(event.target.value)} />
        <Problem text={problems[path]} help={field.help} />
      </div>
    );
  }
  if (field.type === "phrases") {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="pa-page-hero__group">
        <legend>{field.label}</legend>
        {items.map((item, index) => (
          <div key={index} className="pa-page-hero__phrase">
            <input aria-label={`${field.label} ${index + 1}`} value={item} maxLength={field.max + 10} aria-invalid={Boolean(problems[`${path}.${index}`])} onChange={(event) => onChange(items.map((entry, position) => (position === index ? event.target.value : entry)))} />
            <Counter value={item} min={2} max={field.max} />
            {items.length > field.count.min && <button type="button" onClick={() => onChange(items.filter((_, position) => position !== index))} aria-label={`Remove item ${index + 1}`}>×</button>}
            {problems[`${path}.${index}`] && <small className="is-bad">{problems[`${path}.${index}`]}</small>}
          </div>
        ))}
        {items.length < field.count.max && <button type="button" className="pa-page-hero__add" onClick={() => onChange([...items, ""])}>+ Add</button>}
        <Problem text={problems[path]} help={field.help} />
      </fieldset>
    );
  }
  if (field.type === "cta") {
    const known = links.some((link) => link.to === value?.to);
    return (
      <fieldset className="pa-page-hero__group">
        <legend>{field.label}</legend>
        <div className="pa-page-hero__field">
          <div className="pa-page-hero__label-row"><label htmlFor={`${id}-label`}>Button text</label><Counter value={value?.label} min={ctaLabel.min} max={ctaLabel.max} /></div>
          <input id={`${id}-label`} value={value?.label || ""} maxLength={ctaLabel.max + 10} onChange={(event) => onChange({ ...value, label: event.target.value })} />
          <Problem text={problems[`${path}.label`]} />
        </div>
        <div className="pa-page-hero__field">
          <label htmlFor={`${id}-to`}>Opens</label>
          <select id={`${id}-to`} value={known ? value.to : "__custom"} onChange={(event) => onChange({ ...value, to: event.target.value === "__custom" ? (known ? "" : value?.to || "") : event.target.value })}>
            {links.map((link) => <option key={link.to} value={link.to}>{link.label}</option>)}
            <option value="__custom">Other page on this website…</option>
          </select>
          {!known && <input aria-label={`${field.label} link`} placeholder="/services/courses or #section" value={value?.to || ""} onChange={(event) => onChange({ ...value, to: event.target.value })} />}
          <Problem text={problems[`${path}.to`]} />
        </div>
      </fieldset>
    );
  }
  if (field.type === "image") {
    const url = imageUrl(value);
    const sizeProblem = value?.source === "upload" ? imageSizeProblem(value.width, value.height, field) : "";
    return (
      <div className="pa-page-hero__image">
        {url ? <img src={url} alt="" crossOrigin={url.startsWith("blob:") ? undefined : "use-credentials"} /> : <span className="pa-page-hero__blank" />}
        <div>
          <strong>{field.label}</strong>
          <small>WebP only · best {field.recommended} · at least {field.minWidth} × {field.minHeight} px. Shown {field.shown}.</small>
          <div className="pa-page-hero__image-actions">
            <label className="pa-page-hero__upload">
              {value?.source === "upload" ? "Replace (WebP)" : "Upload (WebP)"}
              <input type="file" accept="image/webp,.webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUpload(path, file); }} />
            </label>
            {value?.source === "upload" && <button type="button" onClick={() => onChange({ source: "default", defaultUrl: value.defaultUrl })}>Use website photo</button>}
          </div>
          {value?.source === "upload" && value.width ? <small>{value.width} × {value.height} px{value.size ? ` · ${Math.round(value.size / 1024)} KB` : ""}</small> : <small>Website's own photo</small>}
          {(sizeProblem || problems[path]) && <small className="is-bad">{sizeProblem || problems[path]}</small>}
        </div>
      </div>
    );
  }
  if (field.type === "list") {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="pa-page-hero__list">
        <legend>{field.label}</legend>
        {field.help && <small>{field.help}</small>}
        {items.map((item, index) => (
          <fieldset key={index} className="pa-page-hero__item">
            <legend>{index + 1}</legend>
            {field.item.map((child) => (
              <Field key={child.name} field={child} value={item[child.name]} path={`${path}.${index}.${child.name}`} problems={problems} links={links} ctaLabel={ctaLabel} imageUrl={imageUrl} onUpload={onUpload} busy={busy}
                onChange={(next) => onChange(items.map((entry, position) => (position === index ? { ...entry, [child.name]: next } : entry)))} />
            ))}
          </fieldset>
        ))}
        <Problem text={problems[path]} />
      </fieldset>
    );
  }
  return null;
}

/* Set a value at "cards.2.image" inside a nested values object. */
function setAt(values, path, next) {
  const [head, ...rest] = path.split(".");
  if (!rest.length) return { ...values, [head]: next };
  const list = [...values[head]];
  const [index, ...inner] = rest;
  list[Number(index)] = setAt(list[Number(index)], inner.join("."), next);
  return { ...values, [head]: list };
}

function Preview({ heroKey, device, frameRef: iframeRef, onLoad }) {
  const { width, height } = DEVICES[device];
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const { scale, height: scaledHeight } = useFitScale(width, frameRef, stageRef);
  return (
    <div className={`pa-page-hero__frame pa-page-hero__frame--${device}`} ref={frameRef} style={{ height: scaledHeight || undefined }}>
      <div className="pa-page-hero__stage" ref={stageRef} style={{ width, height, transform: `scale(${scale})` }}>
        <iframe ref={iframeRef} key={`${heroKey}-${device}`} title={`${DEVICES[device].label} preview`} src={heroPreviewUrl(heroKey)} width={width} height={height} onLoad={onLoad} sandbox="allow-scripts allow-same-origin" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    </div>
  );
}

export default function PageHeroesManagement({ canEdit, canViewPages = true, canViewHome = false, canEditHome = false, onDirtyChange }) {
  const [pages, setPages] = useState(() => (canViewHome ? [HOME] : []));
  const [activeKey, setActiveKey] = useState(canViewHome ? HOME.key : "");
  const [data, setData] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [values, setValues] = useState(null);
  const [saved, setSaved] = useState("");
  const [device, setDevice] = useState("desktop");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });
  const iframeRef = useRef(null);
  const blobs = useRef(new Map());
  const localUrls = useRef(new Map());
  const filledRef = useRef(false);
  const [homeDirty, setHomeDirty] = useState(false);
  const isHome = activeKey === HOME.key;

  const fields = data?.schema.fields;
  const dirty = !isHome && Boolean(fields && values) && JSON.stringify(toPayload(fields, values)) !== saved;
  useEffect(() => { onDirtyChange?.(dirty || (isHome && homeDirty)); }, [dirty, homeDirty, isHome, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => { for (const url of localUrls.current.values()) URL.revokeObjectURL(url); }, []);

  const withHome = useCallback((items) => (canViewHome ? [HOME, ...items] : items), [canViewHome]);
  const refreshList = useCallback(() => listPageHeroes().then(({ items }) => setPages(withHome(items))), [withHome]);
  useEffect(() => {
    if (!canViewPages) return undefined;
    let active = true;
    listPageHeroes()
      .then(({ items }) => { if (active) { const list = withHome(items); setPages(list); setActiveKey((key) => key || list[0]?.key || ""); } })
      .catch((error) => { if (active) setMessage({ tone: "bad", text: error.message }); });
    return () => { active = false; };
  }, [canViewPages, withHome]);

  /* Load the chosen page. The form fills once the preview sends its defaults. */
  useEffect(() => {
    if (!activeKey || activeKey === HOME.key) return undefined;
    let active = true;
    getPageHero(activeKey)
      .then((payload) => { if (active) { filledRef.current = false; setData(payload); setDefaults(null); setValues(null); setMessage({ tone: "", text: "" }); } })
      .catch((error) => { if (active) setMessage({ tone: "bad", text: error.message }); });
    return () => { active = false; };
  }, [activeKey]);

  /* Messages from the preview frame (the website). */
  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== PUBLIC_SITE_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "pj-hero-preview-ready" || event.data.key !== activeKey || !data) return;
      const siteDefaults = event.data.defaults || {};
      setDefaults(siteDefaults);
      if (filledRef.current) return;
      filledRef.current = true;
      const next = data.item.values ? withDefaultImages(data.schema.fields, data.item.values, siteDefaults) : fromDefaults(data.schema.fields, siteDefaults);
      setValues(next);
      setSaved(JSON.stringify(toPayload(data.schema.fields, next)));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [activeKey, data]);

  /* Send the draft to the preview; saved uploads are fetched once as Blobs. */
  const sendDraft = useCallback(async () => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame || !fields || !values) return;
    const images = {};
    for (const image of uploadedImages(fields, values)) {
      if (!blobs.current.has(image.mediaId)) {
        try {
          const response = await fetch(pageHeroMediaUrl(image.mediaId), { credentials: "include" });
          if (response.ok) blobs.current.set(image.mediaId, await response.blob());
        } catch { /* preview keeps the website photo */ }
      }
      if (blobs.current.has(image.mediaId)) images[image.mediaId] = blobs.current.get(image.mediaId);
    }
    frame.postMessage({ type: "pj-hero-draft", key: activeKey, values: toPayload(fields, values), images }, PUBLIC_SITE_ORIGIN);
  }, [activeKey, fields, values]);

  useEffect(() => {
    if (!values || !defaults) return undefined;
    const timer = window.setTimeout(() => { void sendDraft(); }, 250);
    return () => window.clearTimeout(timer);
  }, [values, defaults, sendDraft]);

  const problems = useMemo(() => (fields && values ? heroProblems(fields, values, data.ctaLabel) : {}), [fields, values, data]);
  const problemCount = Object.keys(problems).length;

  const imageUrl = useCallback((value) => {
    if (value?.source === "upload") return localUrls.current.get(value.mediaId) || pageHeroMediaUrl(value.mediaId);
    return value?.defaultUrl || "";
  }, []);

  function choosePage(key) {
    if (key === activeKey) return;
    if ((dirty || (isHome && homeDirty)) && !window.confirm("Leave this page hero without saving your changes?")) return;
    setHomeDirty(false);
    setActiveKey(key);
  }

  async function upload(path, file) {
    const field = path.split(".").filter((part) => !/^\d+$/.test(part)).join(".");
    setBusy(true);
    setMessage({ tone: "", text: "Uploading image…" });
    try {
      const { item } = await uploadPageHeroImage(activeKey, field, file);
      blobs.current.set(item.mediaId, file);
      localUrls.current.set(item.mediaId, URL.createObjectURL(file));
      setValues((current) => setAt(current, path, { source: "upload", mediaId: item.mediaId, width: item.width, height: item.height, size: item.size }));
      setMessage({ tone: "good", text: `Image uploaded (${item.width} × ${item.height} px). Save and publish to show it on the website.` });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (problemCount || !dirty) return;
    if (!window.confirm(`Publish the ${data.schema.label} hero to the live website now?`)) return;
    setBusy(true);
    try {
      const payload = await savePageHero(activeKey, { revision: data.item.revision, values: toPayload(fields, values) });
      setData(payload);
      const next = withDefaultImages(fields, payload.item.values, defaults);
      setValues(next);
      setSaved(JSON.stringify(toPayload(fields, next)));
      await refreshList();
      setMessage({ tone: "good", text: "Saved. The page shows the new hero within about a minute." });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm(`Go back to the website's own ${data.schema.label} hero? Your saved text and photos for it are removed from the live page.`)) return;
    setBusy(true);
    try {
      const payload = await resetPageHero(activeKey, data.item.revision);
      setData(payload);
      const next = fromDefaults(fields, defaults);
      setValues(next);
      setSaved(JSON.stringify(toPayload(fields, next)));
      await refreshList();
      setMessage({ tone: "good", text: "The page now uses the website's own hero again." });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    if (!window.confirm("Discard all unsaved changes?")) return;
    const next = data.item.values ? withDefaultImages(fields, data.item.values, defaults) : fromDefaults(fields, defaults);
    setValues(next);
  }

  const page = pages.find((entry) => entry.key === activeKey);
  const pageList = (
    <nav className="pa-page-hero__pages" aria-label="Pages">
      <p className="pa-page-hero__section-label">PAGES</p>
      <ul>
        {pages.map((entry) => (
          <li key={entry.key}>
            <button type="button" aria-current={entry.key === activeKey ? "page" : undefined} onClick={() => choosePage(entry.key)}>
              <strong>{entry.label}</strong>
              <small>{entry.home ? "Home Hero slides" : entry.revision ? `Edited · v${entry.revision}` : "Website default"}</small>
            </button>
          </li>
        ))}
      </ul>
      <small className="pa-page-hero__pages-note">Hardware & Embedded, Rapid Prototyping, Startup, Internships and Contact keep fixed heroes.</small>
    </nav>
  );

  if (isHome) {
    return (
      <section className="pa-page-hero" aria-label="Page Heroes · Home">
        <div className="pa-page-hero__layout pa-page-hero__layout--home">
          {pageList}
          <div className="pa-page-hero__home">
            <HomeHeroManagement canEdit={canEditHome} onDirtyChange={setHomeDirty} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pa-page-hero" aria-labelledby="pa-page-hero-title">
      <header className="pa-page-hero__bar">
        <div>
          <h2 id="pa-page-hero-title">Page Heroes{data ? ` · ${data.schema.label}` : ""}</h2>
          <p>
            {data ? (data.item.revision ? `Live version ${data.item.revision}${data.item.updatedAt ? ` · saved ${new Date(data.item.updatedAt).toLocaleString("en-IN")}` : ""}` : "Using the website's own hero. Nothing saved yet.") : "Loading…"}
            {dirty && <strong> · Unsaved changes</strong>}
          </p>
        </div>
        {canEdit && data && (
          <div className="pa-page-hero__bar-actions">
            {data.item.revision > 0 && <button type="button" className="pa-page-hero__secondary" disabled={busy} onClick={reset}>Use website default</button>}
            <button type="button" className="pa-page-hero__secondary" disabled={busy || !dirty} onClick={discard}>Discard changes</button>
            <button type="button" className="pa-page-hero__primary" disabled={busy || !dirty || problemCount > 0} onClick={save}>Save and publish</button>
          </div>
        )}
      </header>

      {!canEdit && <p className="pa-page-hero__note">You can view page heroes. Ask a Super Admin for “Edit and publish page heroes” to change them.</p>}
      {message.text && <p className={`pa-page-hero__status${message.tone ? ` is-${message.tone}` : ""}`} role="status">{message.text}</p>}
      {problemCount > 0 && <p className="pa-page-hero__problems">{problemCount} field{problemCount === 1 ? "" : "s"} to fix before saving (shown in red).</p>}

      <div className="pa-page-hero__layout">
        {pageList}

        <fieldset className="pa-page-hero__form" disabled={!canEdit || busy || !values}>
          <legend>{data?.schema.label || "Hero"}{page ? <span> · {page.path}</span> : null}</legend>
          {!values && <p className="pa-page-hero__loading">Loading the page’s current hero…</p>}
          {values && fields.map((field) => (
            <Field key={field.name} field={field} value={values[field.name]} path={field.name} problems={problems} links={data.links} ctaLabel={data.ctaLabel} imageUrl={imageUrl} onUpload={upload} busy={busy}
              onChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))} />
          ))}
          {values && <small>{data.linksSource === "website" ? "Button lists come from the website, so new pages appear automatically." : "Button lists are the built-in ones right now; any page can still be typed under “Other page…”."}</small>}
        </fieldset>

        <aside className="pa-page-hero__preview" aria-label="Live preview">
          <div className="pa-page-hero__preview-head">
            <p className="pa-page-hero__section-label">LIVE PREVIEW · THE REAL PAGE</p>
            <div role="tablist" aria-label="Preview size">
              {Object.entries(DEVICES).map(([name, entry]) => (
                <button key={name} type="button" role="tab" aria-selected={device === name} onClick={() => setDevice(name)}>{entry.label}</button>
              ))}
            </div>
          </div>
          {activeKey && <Preview heroKey={activeKey} device={device} frameRef={iframeRef} onLoad={() => { void sendDraft(); }} />}
          <small>The website page itself, with your unsaved changes, at {DEVICES[device].width} px wide. You can scroll inside it.</small>
        </aside>
      </div>
    </section>
  );
}
