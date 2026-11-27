/* =========================================================
   HOME HERO — FORM HELPERS
   Pure functions shared by the Home Hero editor and its
   tests. The limits come from the API (`rules`), so the
   editor always checks exactly what the backend enforces.
========================================================= */

export const TEXT_FIELDS = ["caption", "eyebrow", "title", "highlight", "description", "alt"];

/* Slide text written as the editor shows it, trimmed and with inner spaces
   collapsed, exactly as the backend will store it. */
export const tidy = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function textProblem(value, rule) {
  const length = tidy(value).length;
  if (length < rule.min) return length === 0 ? `${rule.label} is required.` : `${rule.label} needs at least ${rule.min} characters.`;
  if (length > rule.max) return `${rule.label} is ${length - rule.max} characters too long.`;
  return "";
}

export function linkProblem(value, rules) {
  const to = String(value ?? "").trim();
  if (!to) return "Choose where the button leads.";
  if (to.length > rules.linkMax || !new RegExp(rules.linkPattern, "i").test(to)) return "Use a page on this website, such as /services/courses or #home-services.";
  return "";
}

export function imageSizeProblem(width, height, rules) {
  const { minWidth, minHeight, minRatio, maxRatio } = rules.image;
  if (!width || !height) return "";
  if (width < minWidth || height < minHeight) return `This image is ${width} × ${height} px. Use at least ${minWidth} × ${minHeight} px.`;
  const ratio = width / height;
  if (ratio < minRatio || ratio > maxRatio) return `This image is ${ratio.toFixed(2)}:1. Use a landscape image between 3:2 and 16:9 (16:10 is best).`;
  return "";
}

/** Problems keyed by field name, for one slide. Empty object = valid. */
export function slideProblems(slide, rules) {
  const problems = {};
  for (const field of TEXT_FIELDS) {
    const problem = textProblem(slide[field], rules.text[field]);
    if (problem) problems[field] = problem;
  }
  for (const button of ["primary", "secondary"]) {
    const label = textProblem(slide[button]?.label, rules.text.ctaLabel);
    if (label) problems[`${button}.label`] = label;
    const link = linkProblem(slide[button]?.to, rules);
    if (link) problems[`${button}.to`] = link;
  }
  if (!slide.image || (slide.image.source === "upload" && !slide.image.mediaId) || (slide.image.source === "builtin" && !slide.image.builtinKey)) {
    problems.image = "Upload a WebP image.";
  }
  return problems;
}

/** Problems for the whole list, in reading order, for the save bar. */
export function heroProblems(slides, rules) {
  const list = [];
  const { min, max } = rules.slides;
  if (slides.length > max) list.push(`Keep at most ${max} slides.`);
  if (slides.filter((slide) => slide.isVisible).length < min) list.push(`Show at least ${min} slides; the thumbnail strip always shows three.`);
  slides.forEach((slide, index) => {
    const count = Object.keys(slideProblems(slide, rules)).length;
    if (count) list.push(`Slide ${index + 1}: ${count} field${count === 1 ? "" : "s"} to fix.`);
  });
  return list;
}

/** What the API accepts for a save: only known fields, text tidied. */
export function toSavePayload(slides, revision) {
  return {
    revision,
    slides: slides.map((slide) => ({
      key: slide.key,
      isVisible: Boolean(slide.isVisible),
      caption: tidy(slide.caption),
      eyebrow: tidy(slide.eyebrow),
      title: tidy(slide.title),
      highlight: tidy(slide.highlight),
      description: tidy(slide.description),
      alt: tidy(slide.alt),
      image: slide.image.source === "upload"
        ? { source: "upload", mediaId: slide.image.mediaId }
        : { source: "builtin", builtinKey: slide.image.builtinKey },
      primary: { label: tidy(slide.primary.label), to: String(slide.primary.to).trim() },
      secondary: { label: tidy(slide.secondary.label), to: String(slide.secondary.to).trim() },
    })),
  };
}

/* A new slide's id: short, unique in the list, and only a-z, 0-9 and "-". */
export function newSlideKey(slides) {
  const taken = new Set(slides.map((slide) => slide.key));
  for (let index = slides.length + 1; ; index += 1) {
    const key = `slide-${index}`;
    if (!taken.has(key)) return key;
  }
}

export function blankSlide(slides) {
  return {
    key: newSlideKey(slides),
    isVisible: true,
    caption: "",
    eyebrow: "",
    title: "",
    highlight: "",
    description: "",
    alt: "",
    image: { source: "upload", mediaId: null },
    primary: { label: "Explore Services", to: "#home-services" },
    secondary: { label: "Talk to Us", to: "/contact?type=general#pj-contact-help" },
  };
}

/* The website shows three thumbnails; the active slide leads the strip until
   the window reaches the end: 1→[1 2 3], 2→[2 3 4], last→[last three]. */
export function thumbWindowStart(activeIndex, total) {
  return Math.max(0, Math.min(activeIndex, total - 3));
}
