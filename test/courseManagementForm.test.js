import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildCoursePayload } from "../src/utils/courseManagementForm.js";

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
  assert.match(source, /Create course draft/);
  assert.match(source, /Edit course/);
  assert.match(source, /Course modules and lessons/);
  assert.match(source, /Add lesson/);
  assert.match(source, /Add project/);
  assert.match(source, /Add FAQ/);
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
  assert.deepEqual(payload.curriculum, [{ title: "Foundations", description: "", duration: "", lessons: [{ title: "First lesson", summary: "Intro", type: "reading", duration: "", resourceUrl: "https://example.invalid/lesson" }] }]);
  assert.deepEqual(payload.projects, [{ title: "Capstone", description: "Build it", technologies: ["Python", "NumPy"], outcome: "Working model", order: 0 }]);
  assert.deepEqual(payload.faqs, [{ question: "Who is this for?", answer: "Beginners.", order: 0 }]);
  assert.deepEqual(payload.skills, ["Problem solving"]);
  assert.deepEqual(payload.tools, ["Python"]);
});
