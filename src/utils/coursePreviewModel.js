import { createElement } from "react";

const lines = (value) => String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
const validPrice = (value) => value === "" || value == null ? null : Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;

const publishedReview = (review) => review?.published === true
  && String(review.studentName || "").trim()
  && String(review.testimonial || "").trim()
  && Number.isFinite(Number(review.rating))
  && Number(review.rating) >= 1
  && Number(review.rating) <= 5
  && Number.isFinite(new Date(review.reviewDate).getTime());

export function buildCoursePreviewModel(form, {
  imageUrl = "",
  courses = [],
  currentCourseId = "",
  commonFaqs = [],
} = {}) {
  const curriculum = Array.isArray(form.curriculum) ? form.curriculum : [];
  const reviews = (form.reviews || []).filter(publishedReview).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const priceMinor = validPrice(form.priceMinor);
  const listPriceMinor = validPrice(form.listPriceMinor);
  const chosenIds = new Set((form.relatedCourseIds || []).map(String));
  const eligible = courses.filter((course) => String(course._id) !== String(currentCourseId) && course.status === "published");
  const selectedRelated = eligible.filter((course) => chosenIds.has(String(course._id)));
  const automaticRelated = eligible.filter((course) => !chosenIds.has(String(course._id)) && course.category === form.category);
  const relatedCourses = [...selectedRelated, ...automaticRelated].slice(0, 6);
  const relatedSeen = new Set();
  const uniqueRelated = relatedCourses.filter((course) => {
    const id = String(course._id);
    if (!id || relatedSeen.has(id)) return false;
    relatedSeen.add(id);
    return true;
  });
  const faqKeys = new Set();
  const publishedFaqs = [...commonFaqs.filter((faq) => faq?.published === true), ...(form.faqs || []).filter((faq) => faq?.published !== false)]
    .filter((faq) => faq && String(faq.question || "").trim() && String(faq.answer || "").trim())
    .map((faq, index) => ({ ...faq, _previewOrder: Number(faq.order ?? index) }))
    .sort((a, b) => a._previewOrder - b._previewOrder)
    .filter((faq) => {
      const key = faq.question.trim().toLowerCase();
      if (faqKeys.has(key)) return false;
      faqKeys.add(key);
      return true;
    });
  const topicCount = curriculum.reduce((total, module) => total
    + (module.topics?.length || 0)
    + (module.practicalActivities?.length || 0)
    + (module.lessons?.length || 0), 0);

  return {
    title: String(form.title || "").trim(),
    category: String(form.category || "").trim(),
    shortDescription: String(form.shortDescription || "").trim(),
    aboutContent: String(form.aboutContent || ""),
    coverUrl: imageUrl,
    imageAlt: String(form.imageAlt || form.title || "Course thumbnail"),
    priceMinor,
    listPriceMinor,
    discountPercent: priceMinor !== null && listPriceMinor !== null && listPriceMinor > priceMinor && listPriceMinor > 0
      ? Math.round((1 - priceMinor / listPriceMinor) * 100)
      : null,
    premiumEligible: form.premiumEligible === true,
    badgeType: String(form.badgeType || ""),
    badgeLabel: form.badgeType === "other"
      ? String(form.customBadgeLabel || "").trim()
      : ({ "most-purchased": "Most Purchased", trending: "Trending", "top-rated": "Top Rated" }[form.badgeType] || form.badges?.[0] || ""),
    duration: String(form.duration || "").trim(),
    deliveryMode: String(form.deliveryMode || "").trim(),
    sessionLength: String(form.sessionLength || "").trim(),
    sessionCount: form.sessionCount === "" || form.sessionCount == null ? "" : String(form.sessionCount),
    courseValidity: String(form.courseValidity || "").trim(),
    certificate: form.certificate || { available: false, description: "" },
    curriculum,
    moduleCount: curriculum.length,
    topicCount,
    outcomes: form.learningOutcomesText !== undefined ? lines(form.learningOutcomesText) : (form.learningOutcomes || []).filter((item) => String(item).trim()),
    prerequisitesDeclared: form.prerequisitesDeclared === true,
    noPrerequisites: form.noPrerequisites === true,
    prerequisiteDetails: form.prerequisiteDetails || {},
    prerequisites: String(form.prerequisites || "").trim(),
    experienceLevel: String(form.experienceLevel || "").trim(),
    highlights: form.highlightsText !== undefined ? lines(form.highlightsText) : (form.highlights || []).filter((item) => String(item).trim()),
    skills: form.skillsText !== undefined ? lines(form.skillsText) : (form.skills || []).filter((item) => String(item).trim()),
    tools: form.toolsText !== undefined ? lines(form.toolsText) : (form.tools || []).filter((item) => String(item).trim()),
    projects: (form.projects || []).filter((project) => String(project.title || "").trim()),
    instructor: form.instructor || {},
    reviews,
    rating: reviews.length ? Number((reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length).toFixed(1)) : null,
    reviewCount: reviews.length,
    relatedCourses: uniqueRelated,
    faqs: publishedFaqs,
    previewStatus: "Current unsaved form values",
  };
}

const PREVIEW_TAGS = new Set(["P", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "BR"]);

function safeNodes(nodes, keyPrefix = "rich") {
  return Array.from(nodes).map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG"].includes(node.tagName)) return null;
    const children = safeNodes(node.childNodes, key);
    if (!PREVIEW_TAGS.has(node.tagName)) return children;
    const tag = node.tagName.toLowerCase();
    return createElement(tag, { key }, children);
  });
}

// Parse into an inert document, then recreate only a small formatting allow-list as React nodes.
export function renderSafeCourseAbout(markup) {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return String(markup || "").replace(/<(script|style|iframe|object|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<[^>]*>/g, " ").trim();
  }
  const parsed = new DOMParser().parseFromString(`<div>${String(markup || "")}</div>`, "text/html");
  return safeNodes(parsed.body.firstElementChild?.childNodes || []);
}

