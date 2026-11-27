/* =========================================================
   PAGE HEROES — FORM HELPERS (pure, tested)
   The schema comes from the API (pageHero.schemas.js), so the
   form checks exactly what the backend enforces.
========================================================= */

import { linkProblem, tidy } from "./homeHeroForm.js";

const LINK_RULES = {
  linkPattern: "^(\\/(?:[a-z0-9-]+(?:\\/[a-z0-9-]+)*)?\\/?(?:\\?[a-z0-9=&_-]*)?(?:#[a-z0-9-]+)?|#[a-z0-9-]+)$",
  linkMax: 200,
};

export function lengthProblem(value, { label, min = 0, max }) {
  const length = tidy(value).length;
  if (length < min) return length === 0 ? `${label} is required.` : `${label} needs at least ${min} characters.`;
  if (length > max) return `${label} is ${length - max} characters too long.`;
  return "";
}

export function imageSizeProblem(width, height, spec) {
  if (!width || !height) return "";
  if (width < spec.minWidth || height < spec.minHeight) return `This image is ${width} × ${height} px. Use at least ${spec.minWidth} × ${spec.minHeight} px (best ${spec.recommended}).`;
  const ratio = width / height;
  if (ratio < spec.minRatio || ratio > spec.maxRatio) return `This image's shape (${ratio.toFixed(2)}:1) does not fit here. Use ${spec.recommended}.`;
  return "";
}

/** Problems keyed by path (e.g. "cards.2.title"). Empty object = valid. */
export function heroProblems(fields, values, ctaLabel = { min: 2, max: 26 }, prefix = "") {
  const problems = {};
  for (const field of fields) {
    const path = `${prefix}${field.name}`;
    const value = values?.[field.name];
    if (field.type === "text") {
      const problem = lengthProblem(value, field);
      if (problem) problems[path] = problem;
    } else if (field.type === "phrases") {
      const items = Array.isArray(value) ? value : [];
      if (items.length < field.count.min || items.length > field.count.max) problems[path] = `${field.label}: give ${field.count.min === field.count.max ? field.count.min : `${field.count.min}–${field.count.max}`} items.`;
      items.forEach((item, index) => {
        const problem = lengthProblem(item, { label: `Item ${index + 1}`, min: 2, max: field.max });
        if (problem) problems[`${path}.${index}`] = problem;
      });
    } else if (field.type === "cta") {
      const label = lengthProblem(value?.label, { label: "Button text", ...ctaLabel });
      if (label) problems[`${path}.label`] = label;
      const link = linkProblem(value?.to, LINK_RULES);
      if (link) problems[`${path}.to`] = link;
    } else if (field.type === "image") {
      if (!value || (value.source === "upload" && !value.mediaId)) problems[path] = "Upload a WebP image.";
      else if (value.source === "upload") {
        const problem = imageSizeProblem(value.width, value.height, field);
        if (problem) problems[path] = problem;
      }
    } else if (field.type === "list") {
      const items = Array.isArray(value) ? value : [];
      if (items.length !== field.count.min) problems[path] = `${field.label}: give ${field.count.min} items.`;
      items.forEach((item, index) => Object.assign(problems, heroProblems(field.item, item, ctaLabel, `${path}.${index}.`)));
    }
  }
  return problems;
}

/** Website built-in content → form values (images become "default"). */
export function fromDefaults(fields, defaults) {
  const values = {};
  for (const field of fields) {
    const value = defaults?.[field.name];
    if (field.type === "image") values[field.name] = { source: "default", defaultUrl: typeof value === "string" ? value : "" };
    else if (field.type === "list") values[field.name] = (Array.isArray(value) ? value : []).map((item) => fromDefaults(field.item, item));
    else if (field.type === "phrases") values[field.name] = Array.isArray(value) ? [...value] : [];
    else if (field.type === "cta") values[field.name] = { label: value?.label || "", to: value?.to || "" };
    else values[field.name] = typeof value === "string" ? value : "";
  }
  return values;
}

/** Saved values, with each "default" image given the website's photo for display. */
export function withDefaultImages(fields, values, defaults) {
  const out = {};
  for (const field of fields) {
    const value = values?.[field.name];
    if (field.type === "image") out[field.name] = value?.source === "upload" ? value : { source: "default", defaultUrl: typeof defaults?.[field.name] === "string" ? defaults[field.name] : "" };
    else if (field.type === "list") out[field.name] = (Array.isArray(value) ? value : []).map((item, index) => withDefaultImages(field.item, item, defaults?.[field.name]?.[index]));
    else out[field.name] = value;
  }
  return out;
}

/** What the API accepts: schema fields only, text tidied, images by reference. */
export function toPayload(fields, values) {
  const out = {};
  for (const field of fields) {
    const value = values?.[field.name];
    if (field.type === "text") out[field.name] = tidy(value);
    else if (field.type === "phrases") out[field.name] = (value || []).map(tidy);
    else if (field.type === "cta") out[field.name] = { label: tidy(value?.label), to: String(value?.to || "").trim() };
    else if (field.type === "image") out[field.name] = value?.source === "upload" ? { source: "upload", mediaId: value.mediaId } : { source: "default" };
    else if (field.type === "list") out[field.name] = (value || []).map((item) => toPayload(field.item, item));
  }
  return out;
}

/** Every uploaded image in the values: [{ mediaId }]. */
export function uploadedImages(fields, values, list = []) {
  for (const field of fields) {
    const value = values?.[field.name];
    if (field.type === "image" && value?.source === "upload" && value.mediaId) list.push(value);
    else if (field.type === "list") (value || []).forEach((item) => uploadedImages(field.item, item, list));
  }
  return list;
}
