export const COURSE_EDITOR_SECTIONS = [
  { id: "hero", number: "01", title: "Course Hero", description: "Main information students see first." },
  { id: "purchase", number: "02", title: "Price & Certificate", description: "Price, discount and certificate." },
  { id: "about", number: "03", title: "About & Highlights", description: "Course overview shown at the top of the page." },
  { id: "syllabus", number: "04", title: "Curriculum & Projects", description: "Modules, topics, activities and projects." },
  { id: "outcomes", number: "05", title: "What You Will Learn", description: "The learning outcomes list." },
  { id: "delivery", number: "06", title: "Online / Offline", description: "How the classes happen and whether registration is open." },
  { id: "reviews", number: "07", title: "Reviews", description: "Optional student reviews." },
  { id: "related", number: "08", title: "Related Courses", description: "Optional courses to recommend." },
  { id: "faqs", number: "09", title: "FAQs", description: "Optional course-specific questions." },
];

const plain = (value = "") => String(value).replace(/<[^>]*>/g, "").trim();
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;

export function validateCourseForPublish(form, { image, savedCover } = {}) {
  const errors = [];
  const add = (section, field, message, invalid = false) => errors.push({ section, field, message, invalid });
  if (!nonempty(form.category)) add("hero", "category", "Choose a category (up to 30 characters)."); else if (form.category.trim().length > 30) add("hero", "category", "Category must be 30 characters or fewer.", true);
  if (!nonempty(form.title)) add("hero", "title", "Enter a course title (up to 70 characters)."); else if (form.title.trim().length > 70) add("hero", "title", "Course title must be 70 characters or fewer.", true);
  if (!nonempty(form.shortDescription)) add("hero", "shortDescription", "Enter a short description (up to 160 characters)."); else if (form.shortDescription.trim().length > 160) add("hero", "shortDescription", "Short description must be 160 characters or fewer.", true);
  if (!nonempty(form.duration)) add("hero", "duration", "Enter the course duration."); else if (form.duration.trim().length > 100) add("hero", "duration", "Course duration must be 100 characters or fewer.", true);
  if (!image && !savedCover?.mediaId && !savedCover?.filename) add("hero", "coverImage", "Upload a course thumbnail.");
  if (form.badgeType === "other" && !nonempty(form.customBadgeLabel)) add("hero", "customBadgeLabel", "Enter a custom badge label.");
  if (String(form.customBadgeLabel || "").trim().length > 32) add("hero", "customBadgeLabel", "Custom badge labels must be 32 characters or fewer.", true);

  const offer = form.priceMinor === "" || form.priceMinor == null ? NaN : Number(form.priceMinor);
  const original = form.listPriceMinor == null || form.listPriceMinor === "" ? NaN : Number(form.listPriceMinor);
  if (!Number.isSafeInteger(offer)) add("purchase", "priceMinor", "Enter the offer price.", form.priceMinor !== "" && form.priceMinor != null); else if (offer < 0) add("purchase", "priceMinor", "Offer price cannot be negative.", true);
  if (!Number.isSafeInteger(original)) add("purchase", "listPriceMinor", "Enter a valid original price.", form.listPriceMinor != null && form.listPriceMinor !== "");
  else if (original < 0 || (Number.isSafeInteger(offer) && original < offer)) add("purchase", "listPriceMinor", "Original price must be non-negative and at least the offer price.", true);
  if (typeof form.certificate?.available !== "boolean") add("purchase", "certificate", "Choose whether a certificate is available.");

  const about = plain(form.aboutContent);
  if (!about) add("about", "aboutContent", "Add meaningful About This Course content (up to 1,000 characters)."); else if (about.length > 1000) add("about", "aboutContent", "About This Course must be 1,000 characters or fewer.", true);

  const modules = Array.isArray(form.curriculum) ? form.curriculum : [];
  const validModule = modules.some((module) => nonempty(module.title) && [module.topics, module.practicalActivities, module.lessons].some((items) => Array.isArray(items) && items.some((item) => nonempty(item.title))));
  const invalidChildren = modules.some((module) => [module.topics, module.practicalActivities, module.lessons].some((items) => Array.isArray(items) && items.some((item) => !nonempty(item.title))));
  if (!validModule || modules.some((module) => !nonempty(module.title)) || invalidChildren) add("syllabus", "curriculum", "Add at least one titled module with a topic, practical activity or lesson; complete every module and curriculum item title.");
  if ((form.learningOutcomes || []).length === 0 && !nonempty(form.learningOutcomesText)) add("outcomes", "learningOutcomes", "Add at least one learning outcome.");
  const outcomes = form.learningOutcomesText !== undefined ? form.learningOutcomesText.split("\n").map((value) => value.trim()).filter(Boolean) : (form.learningOutcomes || []);
  if (outcomes.some((value) => value.length > 120)) add("outcomes", "learningOutcomes", "Each learning outcome must be 120 characters or fewer.", true);

  if (!["online", "in-person"].includes(form.deliveryMode)) add("delivery", "deliveryMode", "Choose Online or Offline.");

  if ((form.reviews || []).some((review) => !nonempty(review.studentName) || !nonempty(review.testimonial) || !review.reviewDate || !Number.isFinite(Number(review.rating)) || Number(review.rating) < 1 || Number(review.rating) > 5)) add("reviews", "reviews", "Complete or remove every review entry.");
  if ((form.projects || []).some((project) => !nonempty(project.title))) add("syllabus", "projects", "Complete or remove every project title.");
  if ((form.faqs || []).some((faq) => !nonempty(faq.question) || !nonempty(faq.answer))) add("faqs", "faqs", "Complete or remove every FAQ entry.");
  if ((form.relatedCourseIds || []).some((id) => !/^[a-f\d]{24}$/i.test(String(id)))) add("related", "relatedCourseIds", "One related course selection is invalid.");

  return errors;
}

export function getCourseEditorSectionStatuses(form, options) {
  const errors = validateCourseForPublish(form, options);
  const required = new Set(["hero", "purchase", "about", "syllabus", "outcomes", "delivery"]);
  return COURSE_EDITOR_SECTIONS.map((section) => {
    if (!required.has(section.id)) {
      const values = { reviews: form.reviews, related: form.relatedCourseIds, faqs: form.faqs }[section.id] || [];
      const invalidOptional = section.id === "reviews" ? values.some((item) => !nonempty(item.studentName) || !nonempty(item.testimonial) || !item.reviewDate || Number(item.rating) < 1 || Number(item.rating) > 5) : section.id === "faqs" ? values.some((item) => !nonempty(item.question) || !nonempty(item.answer)) : false;
      const hasIssue = invalidOptional || errors.some((error) => error.section === section.id);
      return { ...section, status: hasIssue ? "Needs attention" : values.length ? "Complete" : "Optional" };
    }
    const missingSharedDuration = false;
    const sectionErrors = errors.filter((error) => error.section === section.id);
    const status = sectionErrors.some((error) => error.invalid) ? "Needs attention" : sectionErrors.length || missingSharedDuration ? "Incomplete" : "Complete";
    return { ...section, status };
  });
}
