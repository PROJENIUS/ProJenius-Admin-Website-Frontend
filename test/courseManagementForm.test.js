import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCoursePayload } from "../src/utils/courseManagementForm.js";
import { COURSE_EDITOR_SECTIONS, getCourseEditorSectionStatuses, validateCourseForPublish } from "../src/utils/courseEditorValidation.js";

test("course create and edit payloads omit private delivery and batch/session fields", async () => {
  const privateFields = {
    deliveryDetails: { onlinePlatform: "Hidden Meet" },
    batches: [{ code: "legacy" }],
    startDate: "2026-10-20",
    registrationDeadline: "2026-10-19",
    timezone: "Asia/Kolkata",
    scheduleChangeReason: "legacy reason",
  };
  const form = {
    title: "Synthetic course",
    slug: "synthetic-course",
    shortDescription: "A synthetic course",
    description: "Synthetic editor regression test.",
    category: "Testing",
    duration: "One week",
    priceMinor: "150000",
    deliveryMode: "online",
    learningOutcomesText: "Learn safely",
    curriculumText: "Module one",
    ...privateFields,
  };

  for (const options of [{ creating: true }, { canManageSchedule: true }, {}]) {
    const payload = buildCoursePayload(form, options);
    for (const key of Object.keys(privateFields)) assert.equal(Object.hasOwn(payload, key), false, `${key} is excluded`);
    assert.equal(payload.title, form.title);
    assert.equal(payload.priceMinor, 150000);
    assert.deepEqual(payload.learningOutcomes, ["Learn safely"]);
    assert.deepEqual(payload.curriculum, [{ title: "Module one" }]);
  }

  const source = await readFile(new URL("../src/Components/Admin/CourseManagement/CourseManagement.jsx", import.meta.url), "utf8");
  for (const unwantedText of [
    "Private delivery instructions",
    "Online platform",
    "Online joining link",
    "Online access code",
    "Venue name",
    "Venue address",
    "Reporting time",
    "Batch and session schedule",
    "function BatchEditor",
  ]) assert.equal(source.includes(unwantedText), false, `${unwantedText} is no longer rendered by the course admin`);
  assert.match(source, /Create New Course/);
  assert.match(source, /Edit Course:/);
  assert.match(source, /CourseEditorSections/);
  const editor = await readFile(new URL("../src/Components/Admin/CourseManagement/CourseEditorSections.jsx", import.meta.url), "utf8");
  assert.match(editor, /Lessons \(older courses\)/);
  assert.doesNotMatch(editor, /Premium eligibility|Intended audience|Session length/);
  assert.match(editor, /Add project/);
  assert.match(editor, /Add FAQ/);
  assert.match(editor, /form\.priceMinor == null \|\| form\.priceMinor === "" \? ""/);
  assert.equal(COURSE_EDITOR_SECTIONS.length, 9);
  assert.deepEqual(COURSE_EDITOR_SECTIONS.map(({ number }) => number), ["01","02","03","04","05","06","07","08","09"]);
  assert.deepEqual(COURSE_EDITOR_SECTIONS.map(({ title }) => title), ["Course Hero","Price & Certificate","About & Highlights","Curriculum & Projects","What You Will Learn","Online / Offline","Reviews","Related Courses","FAQs"]);
  assert.match(editor, /pa-course-editor__required/);
  assert.match(editor, /pa-course-editor__nav/);
  assert.doesNotMatch(editor, /style=\{/);
  const styles = await readFile(new URL("../src/Components/Admin/CourseManagement/CourseManagement.css", import.meta.url), "utf8");
  assert.match(styles, /@media\(max-width:900px\)/);
  assert.match(styles, /@media\(max-width:560px\)/);
});

test("structured public course content is normalized into the existing management payload", () => {
  const payload = buildCoursePayload({
    title: "Synthetic course", priceMinor: 149900, listPriceMinor: 199900,
    instructor: { name: "Synthetic Instructor", expertiseText: "Data\nPython" },
    curriculum: [{ _id: "ignored-module-id", title: "Foundations", lessons: [{ _id: "ignored-lesson-id", title: "First lesson", type: "reading", summary: "Intro", resourceUrl: "https://example.invalid/lesson" }] }],
    projects: [{ _id: "ignored-project-id", title: "Capstone", description: "Build it", technologiesText: "Python\nNumPy", outcome: "Working model" }],
    faqs: [{ _id: "ignored-faq-id", question: "Who is this for?", answer: "Beginners." }],
    skillsText: "Problem solving", toolsText: "Python",
  }, { creating: true });

  assert.equal(payload.listPriceMinor, 199900);
  assert.deepEqual(payload.instructor.expertise, ["Data", "Python"]);
  assert.deepEqual(payload.curriculum, [{ _id: "ignored-module-id", title: "Foundations", description: "", duration: "", topics: [], practicalActivities: [], lessons: [{ _id: "ignored-lesson-id", title: "First lesson", summary: "Intro", type: "reading", duration: "", resourceUrl: "https://example.invalid/lesson" }] }]);
  assert.deepEqual(payload.projects, [{ _id: "ignored-project-id", title: "Capstone", description: "Build it", technologies: ["Python", "NumPy"], outcome: "Working model", order: 0 }]);
  assert.deepEqual(payload.faqs, [{ _id: "ignored-faq-id", question: "Who is this for?", answer: "Beginners.", order: 0, published: true }]);
  assert.deepEqual(payload.skills, ["Problem solving"]);
  assert.deepEqual(payload.tools, ["Python"]);
});


test("course payload preserves finalized content fields and only includes scheduling fields with permission", () => {
  const payload = buildCoursePayload({
    title: "Synthetic course", priceMinor: "149900", aboutContent: "<p>About</p>", highlightsText: "Hands-on\nPortfolio", badgeType: "trending",
    prerequisitesDeclared: true, noPrerequisites: false, prerequisiteDetails: { priorKnowledge: "Basic computer use" }, experienceLevel: "beginner-friendly",
    sessionLength: "90 minutes", sessionCount: 8, courseValidity: "12 months",
    curriculum: [{ _id: "module-id", title: "Foundations", topics: [{ _id: "topic-id", title: "Data basics", description: "Intro" }], practicalActivities: [{ title: "Build a chart", description: "Use sample data" }] }],
    reviews: [{ _id: "review-id", studentName: "Synthetic Learner", rating: "5", testimonial: "Clear lessons", reviewDate: "2026-10-01", published: true }],
    relatedCourseIds: ["course-id"],
  }, { creating: true, canManageSchedule: false });
  assert.equal(payload.aboutContent, "<p>About</p>");
  assert.deepEqual(payload.highlights, ["Hands-on", "Portfolio"]);
  assert.equal(payload.badgeType, "trending");
  assert.deepEqual(payload.badges, ["Trending"]);
  assert.equal(payload.prerequisitesDeclared, true);
  assert.equal(payload.experienceLevel, "beginner-friendly");
  assert.equal(payload.sessionLength, undefined);
  assert.equal(payload.curriculum[0].topics[0]._id, "topic-id");
  assert.equal(payload.curriculum[0].practicalActivities[0].title, "Build a chart");
  assert.equal(payload.reviews[0].rating, 5);
  assert.deepEqual(payload.relatedCourseIds, ["course-id"]);
  const schedulePayload = buildCoursePayload({ sessionLength: "90 minutes", sessionCount: 8, courseValidity: "12 months" }, { canManageSchedule: true });
  assert.equal(schedulePayload.sessionCount, 8);
});

test("course editor completion is derived from required form values and optional sections stay optional", () => {
  const statuses = getCourseEditorSectionStatuses({ ...{
    title: "AI Foundations", category: "AI", shortDescription: "Learn the foundations.", duration: "8 weeks",
    priceMinor: 149900, listPriceMinor: 149900, premiumEligible: false, certificate: { available: false },
    aboutContent: "<p>Understand practical artificial intelligence concepts.</p>",
    curriculum: [{ title: "Foundations", topics: [{ title: "Core concepts" }] }],
    learningOutcomesText: "Build a small model", prerequisitesDeclared: true, noPrerequisites: true,
    experienceLevel: "beginner-friendly", deliveryMode: "online", sessionLength: "90 minutes", sessionCount: 8, badgeType: "trending",
    reviews: [], relatedCourseIds: [], faqs: [],
  } }, { savedCover: { filename: "saved.webp" } });
  assert.deepEqual(statuses.slice(0, 6).map(({ status }) => status), Array(6).fill("Complete"));
  assert.deepEqual(statuses.slice(6).map(({ status }) => status), ["Optional", "Optional", "Optional"]);
  assert.ok(validateCourseForPublish({ title: "Incomplete" }).length > 0);
  const deliveryStatus = getCourseEditorSectionStatuses({ ...{
    title: "AI Foundations", category: "AI", shortDescription: "Learn the foundations.", duration: "",
    priceMinor: 149900, listPriceMinor: 149900, premiumEligible: false, certificate: { available: false },
    aboutContent: "About", curriculum: [{ title: "Foundations", topics: [{ title: "Core" }] }], learningOutcomesText: "Outcome",
    prerequisitesDeclared: true, noPrerequisites: true, experienceLevel: "beginner-friendly", deliveryMode: "online", sessionLength: "90 minutes", sessionCount: 8,
  } }, { savedCover: { filename: "saved.webp" } });
  assert.equal(deliveryStatus[0].status, "Incomplete", "a missing duration is reported in the hero section");
  assert.equal(deliveryStatus[5].status, "Complete", "Online / Offline only needs the delivery choice");
});

test("publish validation requires pricing and Online / Offline, not Premium or session details", () => {
  const form = {
    title: "AI Foundations", category: "AI", shortDescription: "Learn the foundations.", duration: "8 weeks",
    priceMinor: 149900, listPriceMinor: null, premiumEligible: undefined, certificate: { available: false },
    aboutContent: "Practical AI foundations.", curriculum: [{ title: "Foundations", topics: [{ title: "Core concepts" }] }],
    learningOutcomesText: "Build a model", prerequisitesDeclared: true, noPrerequisites: true,
    experienceLevel: "beginner-friendly", deliveryMode: "online", sessionLength: "90 minutes", sessionCount: 8, badgeType: "top-rated",
  };
  const fields = validateCourseForPublish(form, { savedCover: { filename: "cover.webp" } }).map(({ field }) => field);
  assert.ok(fields.includes("listPriceMinor"));
  assert.ok(!fields.includes("premiumEligible"));
  assert.ok(!fields.includes("certificate"));
  assert.ok(!fields.includes("sessionLength") && !fields.includes("prerequisitesDeclared") && !fields.includes("badgeType"));
  const hybrid = validateCourseForPublish({ ...form, deliveryMode: "hybrid" }, { savedCover: { filename: "cover.webp" } }).map(({ field }) => field);
  assert.ok(hybrid.includes("deliveryMode"));
});
