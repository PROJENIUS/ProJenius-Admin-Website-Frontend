/* =========================================================
   HOME HERO — EDITOR
   Edits every slide of the website's first screen, with a
   live desktop and phone preview. Nothing reaches the website
   until "Save and publish"; the whole slide list is saved at
   once with the revision it was loaded from.
========================================================= */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { builtinHeroImageUrl, getHomeHero, homeHeroMediaUrl, saveHomeHero, uploadHomeHeroImage } from "../../../services/homeHeroService";
import { blankSlide, heroProblems, imageSizeProblem, slideProblems, tidy, toSavePayload } from "../../../utils/homeHeroForm";
import HomeHeroPreview from "./HomeHeroPreview";
import "./HomeHeroManagement.css";
import "./HomeHeroPreview.css";

const FIELD_HELP = {
  caption: "On the large photo and for screen readers, e.g. “Learning & Development”.",
  eyebrow: "Small blue label above the heading. Shown in capitals.",
  title: "First line of the heading, in white.",
  highlight: "Second line, in blue, typed out letter by letter.",
  description: "One or two sentences under the heading. Include what you do and for whom.",
  alt: "Describe the photo for search engines and screen readers, e.g. “Students testing an IoT prototype in the ProJenius lab”.",
};

/* The five photos shipped with the website. Old slides may still use one;
   new images are always uploaded. */
const BUILTIN_LABELS = {
  "hero-slide-1": "developer workstation",
  "hero-slide-2": "CII Connect AI event",
  "hero-slide-3": "students in the lab",
  "hero-slide-4": "IoT phone",
  "hero-slide-5": "recognition event",
};

function Counter({ value, rule }) {
  const length = tidy(value).length;
  const state = length > rule.max || (length > 0 && length < rule.min) ? " is-bad" : length > rule.max * 0.9 ? " is-near" : "";
  return <span className={`pa-hero-editor__count${state}`}>{length}/{rule.max}</span>;
}

function TextField({ label, field, slide, rules, problems, onChange, multiline }) {
  const rule = rules.text[field];
  const id = `hero-${slide.key}-${field}`;
  const problem = problems[field];
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="pa-hero-editor__field">
      <div className="pa-hero-editor__label-row">
        <label htmlFor={id}>{label}</label>
        <Counter value={slide[field]} rule={rule} />
      </div>
      <Tag
        id={id}
        value={slide[field]}
        maxLength={rule.max + 20}
        rows={multiline ? 3 : undefined}
        aria-invalid={Boolean(problem)}
        aria-describedby={`${id}-help`}
        onChange={(event) => onChange({ [field]: event.target.value })}
      />
      <small id={`${id}-help`} className={problem ? "is-bad" : ""}>{problem || FIELD_HELP[field]}</small>
    </div>
  );
}

function ButtonField({ which, title, slide, rules, links, problems, onChange }) {
  const cta = slide[which];
  const known = links.some((link) => link.to === cta.to);
  const [custom, setCustom] = useState(!known);
  const id = `hero-${slide.key}-${which}`;
  const update = (patch) => onChange({ [which]: { ...cta, ...patch } });
  return (
    <fieldset className="pa-hero-editor__button">
      <legend>{title}</legend>
      <div className="pa-hero-editor__field">
        <div className="pa-hero-editor__label-row">
          <label htmlFor={`${id}-label`}>Button text</label>
          <Counter value={cta.label} rule={rules.text.ctaLabel} />
        </div>
        <input id={`${id}-label`} value={cta.label} maxLength={rules.text.ctaLabel.max + 10} aria-invalid={Boolean(problems[`${which}.label`])} onChange={(event) => update({ label: event.target.value })} />
        {problems[`${which}.label`] && <small className="is-bad">{problems[`${which}.label`]}</small>}
      </div>
      <div className="pa-hero-editor__field">
        <label htmlFor={`${id}-to`}>Opens</label>
        <select
          id={`${id}-to`}
          value={custom ? "__custom" : cta.to}
          onChange={(event) => {
            if (event.target.value === "__custom") { setCustom(true); return; }
            setCustom(false);
            update({ to: event.target.value });
          }}
        >
          {links.map((link) => <option key={link.to} value={link.to}>{link.label}</option>)}
          <option value="__custom">Other page on this website…</option>
        </select>
        {custom && <input aria-label={`${title} link`} placeholder="/services/courses or #home-services" value={cta.to} maxLength={rules.linkMax} onChange={(event) => update({ to: event.target.value })} />}
        {problems[`${which}.to`] && <small className="is-bad">{problems[`${which}.to`]}</small>}
      </div>
    </fieldset>
  );
}

export default function HomeHeroManagement({ canEdit, onDirtyChange }) {
  const [config, setConfig] = useState(null);
  const [slides, setSlides] = useState([]);
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState("[]");
  const [isDefault, setIsDefault] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selected, setSelected] = useState(0);
  const [device, setDevice] = useState("desktop");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ tone: "", text: "" });
  const [imageNotes, setImageNotes] = useState({});
  const localUrls = useRef(new Map());

  const apply = useCallback((data) => {
    const next = data.item.slides.map((slide) => structuredClone(slide));
    setConfig({ rules: data.rules, links: data.links, linksSource: data.linksSource });
    setSlides(next);
    setRevision(data.item.revision);
    setSaved(JSON.stringify(toSavePayload(next, data.item.revision)));
    setIsDefault(data.item.isDefault);
    setUpdatedAt(data.item.updatedAt);
    setSelected((index) => Math.min(index, next.length - 1));
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      apply(await getHomeHero());
      setMessage({ tone: "", text: "" });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }, [apply]);

  useEffect(() => {
    let active = true;
    getHomeHero()
      .then((data) => { if (active) apply(data); })
      .catch((error) => { if (active) setMessage({ tone: "bad", text: error.message }); });
    return () => { active = false; };
  }, [apply]);

  useEffect(() => () => {
    for (const url of localUrls.current.values()) URL.revokeObjectURL(url);
  }, []);

  const rules = config?.rules;
  const dirty = Boolean(config) && JSON.stringify(toSavePayload(slides, revision)) !== saved;
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const problems = useMemo(() => (rules ? heroProblems(slides, rules) : []), [slides, rules]);
  const slide = slides[selected];
  const slideIssues = slide && rules ? slideProblems(slide, rules) : {};
  const visibleSlides = slides.filter((entry) => entry.isVisible);
  const previewIndex = Math.max(0, visibleSlides.findIndex((entry) => entry.key === slide?.key));

  const imageUrl = useCallback((entry) => {
    if (!entry?.image) return "";
    if (entry.image.source === "builtin") return builtinHeroImageUrl(entry.image.builtinKey);
    return localUrls.current.get(entry.image.mediaId) || (entry.image.mediaId ? homeHeroMediaUrl(entry.image.mediaId) : "");
  }, []);

  const patchSlide = (index, patch) => setSlides((current) => current.map((entry, position) => (position === index ? { ...entry, ...patch } : entry)));

  function move(index, step) {
    const target = index + step;
    if (target < 0 || target >= slides.length) return;
    setSlides((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelected(target);
  }

  function remove(index) {
    if (!window.confirm(`Delete slide ${index + 1} “${slides[index].caption || "untitled"}”? It is removed from the website when you save.`)) return;
    setSlides((current) => current.filter((_, position) => position !== index));
    setSelected((current) => Math.max(0, Math.min(current, slides.length - 2)));
  }

  function add() {
    setSlides((current) => [...current, blankSlide(current)]);
    setSelected(slides.length);
  }

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !slide) return;
    const key = slide.key;
    setBusy(true);
    setMessage({ tone: "", text: "Uploading image…" });
    try {
      const { item } = await uploadHomeHeroImage(file);
      localUrls.current.set(item.mediaId, URL.createObjectURL(file));
      setSlides((current) => current.map((entry) => (entry.key === key ? { ...entry, image: { source: "upload", mediaId: item.mediaId, width: item.width, height: item.height, size: item.size } } : entry)));
      setImageNotes((notes) => ({ ...notes, [key]: `${item.width} × ${item.height} px · ${Math.round(item.size / 1024)} KB${item.size > 500 * 1024 ? " — over 500 KB, so the page loads slower. Compress it if you can." : ""}` }));
      setMessage({ tone: "good", text: "Image uploaded. Save and publish to show it on the website." });
    } catch (error) {
      setMessage({ tone: "bad", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (problems.length || !dirty) return;
    if (!window.confirm("Publish these Home Hero slides to the live website now?")) return;
    setBusy(true);
    try {
      apply(await saveHomeHero(toSavePayload(slides, revision)));
      setMessage({ tone: "good", text: "Saved. The website shows the new slides within about a minute." });
    } catch (error) {
      setMessage({ tone: "bad", text: error.status === 409 ? `${error.message}` : error.message });
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    if (!window.confirm("Discard all unsaved changes?")) return;
    void load();
  }

  if (!config) {
    return <section className="pa-hero-editor"><p className="pa-hero-editor__status" role="status">{message.text || "Loading Home Hero…"}</p></section>;
  }

  const readOnly = !canEdit;
  const sizeProblem = slide?.image?.source === "upload" ? imageSizeProblem(slide.image.width, slide.image.height, rules) : "";

  return (
    <section className="pa-hero-editor" aria-labelledby="pa-hero-editor-title">
      <header className="pa-hero-editor__bar">
        <div>
          <h2 id="pa-hero-editor-title">Home Hero</h2>
          <p>
            {isDefault ? "Showing the website's built-in slides. Nothing is saved yet." : `Live version ${revision}${updatedAt ? ` · saved ${new Date(updatedAt).toLocaleString("en-IN")}` : ""}`}
            {dirty && <strong> · Unsaved changes</strong>}
          </p>
        </div>
        {!readOnly && (
          <div className="pa-hero-editor__bar-actions">
            <button type="button" className="pa-hero-editor__secondary" disabled={busy || !dirty} onClick={discard}>Discard changes</button>
            <button type="button" className="pa-hero-editor__primary" disabled={busy || !dirty || problems.length > 0} onClick={save}>Save and publish</button>
          </div>
        )}
      </header>

      {readOnly && <p className="pa-hero-editor__note">You can view the Home Hero. Ask a Super Admin for the “Edit Home Hero” permission to change it.</p>}
      {message.text && <p className={`pa-hero-editor__status${message.tone ? ` is-${message.tone}` : ""}`} role="status">{message.text}</p>}
      {problems.length > 0 && (
        <ul className="pa-hero-editor__problems" aria-label="Fix before saving">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      )}

      <div className="pa-hero-editor__layout">
        <nav className="pa-hero-editor__slides" aria-label="Slides">
          <p className="pa-hero-editor__section-label">SLIDES · {visibleSlides.length} shown · {rules.slides.min}–{rules.slides.max} allowed</p>
          <ol>
            {slides.map((entry, index) => {
              const issues = Object.keys(slideProblems(entry, rules)).length;
              return (
                <li key={entry.key} className={`${index === selected ? "is-selected" : ""}${entry.isVisible ? "" : " is-hidden"}`}>
                  <button type="button" className="pa-hero-editor__slide-pick" onClick={() => setSelected(index)} aria-current={index === selected ? "true" : undefined}>
                    {imageUrl(entry) ? <img src={imageUrl(entry)} alt="" crossOrigin="use-credentials" /> : <span className="pa-hero-editor__slide-blank" />}
                    <span>
                      <strong>{index + 1}. {entry.caption || "Untitled slide"}</strong>
                      <small>{entry.isVisible ? "Shown" : "Hidden"}{issues ? ` · ${issues} to fix` : ""}</small>
                    </span>
                  </button>
                  {!readOnly && (
                    <div className="pa-hero-editor__slide-tools">
                      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move slide ${index + 1} up`}>↑</button>
                      <button type="button" onClick={() => move(index, 1)} disabled={index === slides.length - 1} aria-label={`Move slide ${index + 1} down`}>↓</button>
                      <button type="button" onClick={() => patchSlide(index, { isVisible: !entry.isVisible })} aria-pressed={!entry.isVisible}>{entry.isVisible ? "Hide" : "Show"}</button>
                      <button type="button" onClick={() => remove(index)} disabled={slides.length <= 1} aria-label={`Delete slide ${index + 1}`}>Delete</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {!readOnly && <button type="button" className="pa-hero-editor__add" onClick={add} disabled={slides.length >= rules.slides.max}>+ Add slide</button>}
        </nav>

        {slide && (
          <fieldset className="pa-hero-editor__form" disabled={readOnly || busy}>
            <legend>Slide {selected + 1}{slide.isVisible ? "" : " (hidden)"}</legend>

            <section className="pa-hero-editor__group">
              <h3>Image</h3>
              <div className="pa-hero-editor__image">
                {imageUrl(slide) ? <img src={imageUrl(slide)} alt="" crossOrigin="use-credentials" /> : <span className="pa-hero-editor__slide-blank" />}
                <div>
                  <p><strong>Required:</strong> WebP only, landscape, at least {rules.image.minWidth} × {rules.image.minHeight} px, between 3:2 and 16:9. <strong>Best:</strong> {rules.image.recommended}.</p>
                  <p>The same photo is the large image (cropped to 4:3), the thumbnail and the dimmed page background, so keep the main subject in the centre.</p>
                  <label className="pa-hero-editor__upload">
                    {slide.image.source === "upload" && slide.image.mediaId ? "Replace image (WebP)" : "Upload image (WebP)"}
                    <input type="file" accept="image/webp,.webp" onChange={chooseImage} />
                  </label>
                  {slide.image.source === "builtin" && <small>Using the website's original photo ({BUILTIN_LABELS[slide.image.builtinKey] || "built-in"}). Upload a WebP to replace it.</small>}
                  {slide.image.source === "upload" && <small>{imageNotes[slide.key] || (slide.image.width ? `${slide.image.width} × ${slide.image.height} px` : "")}</small>}
                  {(sizeProblem || slideIssues.image) && <small className="is-bad">{sizeProblem || slideIssues.image}</small>}
                </div>
              </div>
              <TextField label="Image description (alt text)" field="alt" slide={slide} rules={rules} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
              <TextField label="Image caption" field="caption" slide={slide} rules={rules} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
            </section>

            <section className="pa-hero-editor__group">
              <h3>Text</h3>
              <TextField label="Eyebrow" field="eyebrow" slide={slide} rules={rules} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
              <TextField label="Heading (white)" field="title" slide={slide} rules={rules} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
              <TextField label="Heading highlight (blue)" field="highlight" slide={slide} rules={rules} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
              <TextField label="Description" field="description" slide={slide} rules={rules} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} multiline />
            </section>

            <section className="pa-hero-editor__group pa-hero-editor__group--buttons">
              <h3>Buttons</h3>
              <small>{config.linksSource === "website" ? "The “Opens” list comes from the website itself, so new pages and sections appear here automatically after the website is updated." : "The “Opens” list is the built-in one because the website's page list could not be read just now. You can still type any page under “Other page on this website…”."}</small>
              <ButtonField key={`${slide.key}-primary`} which="primary" title="Main button (blue)" slide={slide} rules={rules} links={config.links} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
              <ButtonField key={`${slide.key}-secondary`} which="secondary" title="Second button (outline)" slide={slide} rules={rules} links={config.links} problems={slideIssues} onChange={(patch) => patchSlide(selected, patch)} />
            </section>
          </fieldset>
        )}

        <aside className="pa-hero-editor__preview" aria-label="Live preview">
          <div className="pa-hero-editor__preview-head">
            <p className="pa-hero-editor__section-label">LIVE PREVIEW{slide && !slide.isVisible ? " · this slide is hidden" : ""}</p>
            <div role="tablist" aria-label="Preview size">
              <button type="button" role="tab" aria-selected={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button>
              <button type="button" role="tab" aria-selected={device === "mobile"} onClick={() => setDevice("mobile")}>Phone</button>
            </div>
          </div>
          <HomeHeroPreview
            slides={slide && !slide.isVisible ? [slide] : visibleSlides}
            activeIndex={slide && !slide.isVisible ? 0 : previewIndex}
            imageUrl={imageUrl}
            device={device}
            onSelect={(index) => setSelected(slides.findIndex((entry) => entry.key === visibleSlides[index]?.key))}
          />
          <p className="pa-hero-editor__preview-note">Drawn at the real page width ({device === "desktop" ? "1440" : "390"} px) and scaled down. The blue line types out on the website; here it is shown in full.</p>
        </aside>
      </div>
    </section>
  );
}
