import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blankSlide, heroProblems, imageSizeProblem, linkProblem, slideProblems, thumbWindowStart, toSavePayload } from "../src/utils/homeHeroForm.js";

// Same shape the API sends (projenius-backend src/modules/homepage/homeHero.rules.js).
const rules = {
  slides: { min: 3, max: 10 },
  text: {
    caption: { label: "Image caption", min: 3, max: 28 },
    eyebrow: { label: "Eyebrow", min: 3, max: 34 },
    title: { label: "Heading (white)", min: 3, max: 25 },
    highlight: { label: "Heading highlight (blue)", min: 3, max: 25 },
    description: { label: "Description", min: 40, max: 150 },
    alt: { label: "Image description (alt text)", min: 10, max: 125 },
    ctaLabel: { label: "Button text", min: 2, max: 22 },
  },
  image: { minWidth: 1600, minHeight: 1000, minRatio: 1.5, maxRatio: 1.8 },
  linkPattern: "^(\\/(?:[a-z0-9-]+(?:\\/[a-z0-9-]+)*)?\\/?(?:\\?[a-z0-9=&_-]*)?(?:#[a-z0-9-]+)?|#[a-z0-9-]+)$",
  linkMax: 200,
};

const filled = {
  caption: "Learning & Development",
  eyebrow: "Courses · Internships · Workshops",
  title: "Build Skills Through",
  highlight: "Real-World Technology",
  description: "Industry-oriented courses, internships and hands-on workshops in AI, IoT, embedded systems and full-stack development.",
  alt: "Students working together on a hardware prototype in a lab",
};

test("a new slide needs an uploaded image", () => {
  assert.match(slideProblems(blankSlide([]), rules).image, /WebP/);
});

const good = {
  ...blankSlide([]),
  image: { source: "upload", mediaId: "b".repeat(24) },
  ...filled,
};

test("a complete slide has no problems; each limit is reported by field", () => {
  assert.deepEqual(slideProblems(good, rules), {});
  const bad = { ...good, highlight: "x".repeat(26), description: "Too short", primary: { label: "Go", to: "https://evil.example" } };
  const problems = slideProblems(bad, rules);
  assert.match(problems.highlight, /1 characters too long/);
  assert.match(problems.description, /at least 40/);
  assert.match(problems["primary.to"], /page on this website/);
});

test("links stay inside the website", () => {
  for (const to of ["/services/courses", "/services/courses#course-catalog", "/contact?type=general#pj-contact-help", "#home-services", "/"]) assert.equal(linkProblem(to, rules), "", to);
  for (const to of ["//evil.example", "javascript:alert(1)", "https://example.com", "/a b", ""]) assert.notEqual(linkProblem(to, rules), "", to);
});

test("image size and shape follow the hero rules", () => {
  assert.equal(imageSizeProblem(1920, 1200, rules), "");
  assert.match(imageSizeProblem(1280, 800, rules), /at least 1600 × 1000/);
  assert.match(imageSizeProblem(2400, 1000, rules), /3:2 and 16:9/);
});

test("the slide list needs three shown slides and at most six", () => {
  const three = [good, { ...good, key: "b" }, { ...good, key: "c" }];
  assert.deepEqual(heroProblems(three, rules), []);
  assert.match(heroProblems([good, { ...good, key: "b" }, { ...good, key: "c", isVisible: false }], rules)[0], /at least 3/);
  assert.equal(heroProblems(Array.from({ length: 10 }, (_, index) => ({ ...good, key: `k${index}` })), rules).length, 0, "ten slides are allowed");
  assert.match(heroProblems(Array.from({ length: 11 }, (_, index) => ({ ...good, key: `k${index}` })), rules)[0], /at most 10/);
});

test("the save payload sends only known fields with tidy text", () => {
  const payload = toSavePayload([{ ...good, title: "  Build   Skills ", image: { source: "upload", mediaId: "a".repeat(24), width: 1920, height: 1200 }, extra: "x" }], 4);
  assert.equal(payload.revision, 4);
  assert.equal(payload.slides[0].title, "Build Skills");
  assert.deepEqual(payload.slides[0].image, { source: "upload", mediaId: "a".repeat(24) });
  assert.equal("extra" in payload.slides[0], false);
});

test("thumbnail window matches the website", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => thumbWindowStart(index, 5)), [0, 1, 2, 2, 2]);
});

test("Home Hero sits inside Page Heroes, behind its own permissions", async () => {
  const sidebar = await readFile(new URL("../src/Components/Admin/AdminSidebar/AdminSidebar.jsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../src/Components/Admin/AdminWorkspace/AdminWorkspace.jsx", import.meta.url), "utf8");
  const permissions = await readFile(new URL("../src/utils/permissionOptions.js", import.meta.url), "utf8");
  assert.doesNotMatch(sidebar, /label: "Home Hero"/, "no separate Home Hero menu item");
  assert.match(sidebar, /label: "Page Heroes".*"home:hero:view", "home:hero:edit", "pages:heroes:view", "pages:heroes:edit"/);
  assert.match(workspace, /canEditHome=\{hasPermission\(admin, "home:hero:edit"\)\}/);
  assert.match(permissions, /permission: "home:hero:edit"/);
});

test("page hero form: problems, defaults and payload follow the schema", async () => {
  const { fromDefaults, heroProblems, toPayload, uploadedImages, withDefaultImages } = await import("../src/utils/pageHeroForm.js");
  const fields = [
    { name: "title", type: "text", label: "Heading (white)", min: 3, max: 26 },
    { name: "accent", type: "phrases", label: "Highlight", max: 22, count: { min: 1, max: 3 } },
    { name: "primary", type: "cta", label: "Main button" },
    { name: "cards", type: "list", label: "Photo cards", count: { min: 2, max: 2 }, item: [
      { name: "image", type: "image", label: "Photo", minWidth: 800, minHeight: 680, minRatio: 1, maxRatio: 1.6, recommended: "1200 × 1000 px" },
      { name: "title", type: "text", label: "Card title", min: 3, max: 32 },
    ] },
  ];
  const site = { title: "Technology. Innovation.", accent: ["Real-World Impact."], primary: { label: "Talk to Our Team", to: "/contact" }, cards: [{ image: "http://site/a.webp", title: "One" }, { image: "http://site/b.webp", title: "Two" }] };
  const values = fromDefaults(fields, site);
  assert.deepEqual(values.cards[0].image, { source: "default", defaultUrl: "http://site/a.webp" });
  assert.deepEqual(heroProblems(fields, values), {});
  const bad = { ...values, title: "x".repeat(27), primary: { label: "Go", to: "https://evil.example" }, cards: [{ ...values.cards[0], image: { source: "upload", mediaId: "a".repeat(24), width: 600, height: 500 } }, values.cards[1]] };
  const problems = heroProblems(fields, bad);
  assert.ok(problems.title && problems["primary.to"] && problems["cards.0.image"]);
  const payload = toPayload(fields, bad);
  assert.deepEqual(payload.cards[0].image, { source: "upload", mediaId: "a".repeat(24) });
  assert.deepEqual(payload.cards[1].image, { source: "default" });
  assert.equal(uploadedImages(fields, bad).length, 1);
  const saved = withDefaultImages(fields, payload, site);
  assert.equal(saved.cards[1].image.defaultUrl, "http://site/b.webp");
});
