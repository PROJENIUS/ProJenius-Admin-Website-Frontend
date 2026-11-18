const COURSE_FIELDS = [
  "title",
  "slug",
  "shortDescription",
  "description",
  "category",
  "duration",
  "priceMinor",
  "listPriceMinor",
  "premiumEligible",
  "language",
  "level",
  "audience",
  "prerequisites",
  "internalCostMinor",
  "instructor",
  "certificate",
  "aboutContent",
  "highlights",
  "badgeType",
  "customBadgeLabel",
  "badges",
  "prerequisitesDeclared",
  "noPrerequisites",
  "prerequisiteDetails",
  "experienceLevel",
  "reviews",
  "relatedCourseIds",
];

const lines = (value) => (value || "").split("\n").map((item) => item.trim()).filter(Boolean);

export function buildCoursePayload(form, { canManageSchedule = false, creating = false } = {}) {
  const allowedFields = [...COURSE_FIELDS];
  if (canManageSchedule) allowedFields.push("deliveryMode", "sessionLength", "sessionCount", "courseValidity");
  else if (creating) allowedFields.push("deliveryMode");

  const instructor = form.instructor ? {
    name: form.instructor.name || "",
    designation: form.instructor.designation || "",
    bio: form.instructor.bio || "",
    expertise: form.instructor.expertiseText !== undefined ? lines(form.instructor.expertiseText) : form.instructor.expertise || [],
    profileUrl: form.instructor.profileUrl || "",
  } : undefined;
  const curriculum = Array.isArray(form.curriculum) ? form.curriculum.map((module) => ({
    ...(module._id ? { _id: module._id } : {}),
    title: module.title,
    description: module.description || "",
    duration: module.duration || "",
    topics: (module.topics || []).map((topic, order) => ({ ...(topic._id ? { _id: topic._id } : {}), title: topic.title, description: topic.description || "", order })),
    practicalActivities: (module.practicalActivities || []).map((activity, order) => ({ ...(activity._id ? { _id: activity._id } : {}), title: activity.title, description: activity.description || "", order })),
    lessons: (module.lessons || []).map((lesson) => ({ ...(lesson._id ? { _id: lesson._id } : {}), title: lesson.title, summary: lesson.summary || "", type: lesson.type || "reading", duration: lesson.duration || "", resourceUrl: lesson.resourceUrl || "" })),
  })) : lines(form.curriculumText).map((title) => ({ title }));
  return {
    ...Object.fromEntries(allowedFields.filter((key) => form[key] !== undefined).map((key) => [key, form[key]])),
    ...(instructor ? { instructor } : {}),
    priceMinor: Number(form.priceMinor),
    learningOutcomes: form.learningOutcomesText !== undefined ? lines(form.learningOutcomesText) : form.learningOutcomes || [],
    skills: form.skillsText !== undefined ? lines(form.skillsText) : form.skills || [],
    tools: form.toolsText !== undefined ? lines(form.toolsText) : form.tools || [],
    curriculum,
    projects: (form.projects || []).map((project, order) => ({ ...(project._id ? { _id: project._id } : {}), title: project.title, description: project.description || "", technologies: Array.isArray(project.technologies) ? project.technologies : lines(project.technologiesText), outcome: project.outcome || "", order })),
    faqs: (form.faqs || []).map((faq, order) => ({ ...(faq._id ? { _id: faq._id } : {}), question: faq.question, answer: faq.answer, order, published: faq.published !== false })),
    highlights: form.highlightsText !== undefined ? lines(form.highlightsText) : form.highlights || [],
    ...(form.badgeType ? { badgeType: form.badgeType } : {}),
    customBadgeLabel: form.badgeType === "other" ? String(form.customBadgeLabel || "").trim() : "",
    badges: form.badgeType === "other" && form.customBadgeLabel?.trim()
      ? [String(form.customBadgeLabel).trim()]
      : form.badgeType
        ? [{ "most-purchased": "Most Purchased", trending: "Trending", "top-rated": "Top Rated" }[form.badgeType]]
        : form.badgesText !== undefined
          ? lines(form.badgesText)
          : form.badges || [],
    reviews: (form.reviews || []).map((review, order) => ({ ...(review._id ? { _id: review._id } : {}), studentName: review.studentName, rating: Number(review.rating), testimonial: review.testimonial, reviewDate: review.reviewDate, photoUrl: review.photoUrl || "", published: Boolean(review.published), order })),
    relatedCourseIds: form.relatedCourseIds || [],
  };
}
