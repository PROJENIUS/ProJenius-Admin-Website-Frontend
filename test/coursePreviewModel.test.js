import test from "node:test";
import assert from "node:assert/strict";
import { buildCoursePreviewModel, renderSafeCourseAbout } from "../src/utils/coursePreviewModel.js";

test("course card preview reflects current form fields and selected image without fabricating ratings", () => {
  const model = buildCoursePreviewModel({
    title: "Live title",
    category: "Development",
    shortDescription: "Live summary",
    priceMinor: 199900,
    listPriceMinor: 249900,
    duration: "8 weeks",
    deliveryMode: "online",
    curriculum: [{ title: "Module one", topics: [{ title: "Topic one" }], practicalActivities: [], lessons: [] }],
    reviews: [],
  }, { imageUrl: "blob:thumbnail" });

  assert.equal(model.title, "Live title");
  assert.equal(model.category, "Development");
  assert.equal(model.shortDescription, "Live summary");
  assert.equal(model.coverUrl, "blob:thumbnail");
  assert.equal(model.priceMinor, 199900);
  assert.equal(model.discountPercent, 20);
  assert.equal(model.moduleCount, 1);
  assert.equal(model.topicCount, 1);
  assert.equal(model.rating, null);
  assert.equal(model.reviewCount, 0);
});

test("equal and missing prices do not show a fabricated discount or price", () => {
  assert.equal(buildCoursePreviewModel({ priceMinor: 10000, listPriceMinor: 10000 }).discountPercent, null);
  const missing = buildCoursePreviewModel({ priceMinor: "", listPriceMinor: null });
  assert.equal(missing.priceMinor, null);
  assert.equal(missing.listPriceMinor, null);
  assert.equal(missing.discountPercent, null);
});

test("premium badge and rating use only explicitly eligible current published reviews", () => {
  const model = buildCoursePreviewModel({
    premiumEligible: true,
    reviews: [
      { studentName: "Published learner", testimonial: "Useful course", rating: 4, reviewDate: "2026-10-15", published: true, order: 1 },
      { studentName: "Draft learner", testimonial: "Not public", rating: 5, published: false, order: 0 },
      { studentName: "Incomplete", testimonial: "", rating: 5, published: true, order: 2 },
    ],
  });
  assert.equal(model.premiumEligible, true);
  assert.equal(model.reviewCount, 1);
  assert.equal(model.rating, 4);
  assert.equal(model.reviews[0].studentName, "Published learner");
});

test("detail preview filters related courses and combines only applicable published FAQs", () => {
  const courses = [
    { _id: "current", title: "Current", category: "AI", status: "published" },
    { _id: "selected", title: "Selected", category: "Other", status: "published" },
    { _id: "auto", title: "Automatic", category: "AI", status: "published" },
    { _id: "draft", title: "Draft", category: "AI", status: "draft" },
  ];
  const model = buildCoursePreviewModel({
    category: "AI",
    relatedCourseIds: ["selected", "selected", "current", "draft"],
    faqs: [
      { question: "Published question", answer: "Answer", order: 2, published: true },
      { question: "Hidden question", answer: "Hidden", order: 3, published: false },
    ],
  }, {
    currentCourseId: "current",
    courses,
    commonFaqs: [{ question: "Common question", answer: "Common answer", order: 1, published: true }],
  });

  assert.deepEqual(model.relatedCourses.map((course) => course._id), ["selected", "auto"]);
  assert.deepEqual(model.faqs.map((faq) => faq.question), ["Common question", "Published question"]);
});

test("about preview strips markup in non-browser rendering fallback", () => {
  assert.equal(renderSafeCourseAbout("<p>Paragraph</p><script>bad()</script>"), "Paragraph");
});
