const COURSE_FIELDS = [
  "title",
  "slug",
  "shortDescription",
  "description",
  "category",
  "duration",
  "priceMinor",
  "listPriceMinor",
  "language",
  "level",
  "audience",
  "prerequisites",
  "internalCostMinor",
  "instructor",
  "certificate",
];

const lines = (value) => (value || "").split("\n").map((item) => item.trim()).filter(Boolean);

export function buildCoursePayload(form, { canManageSchedule = false, creating = false } = {}) {
  const allowedFields = [...COURSE_FIELDS];
  if (canManageSchedule) allowedFields.push("deliveryMode");
  else if (creating) allowedFields.push("deliveryMode");

  const instructor = form.instructor ? {
    name: form.instructor.name || "",
    designation: form.instructor.designation || "",
    bio: form.instructor.bio || "",
    expertise: form.instructor.expertiseText !== undefined ? lines(form.instructor.expertiseText) : form.instructor.expertise || [],
    profileUrl: form.instructor.profileUrl || "",
  } : undefined;
  const curriculum = Array.isArray(form.curriculum) ? form.curriculum.map((module) => ({
    title: module.title,
    description: module.description || "",
    duration: module.duration || "",
    lessons: (module.lessons || []).map((lesson) => ({ title: lesson.title, summary: lesson.summary || "", type: lesson.type || "reading", duration: lesson.duration || "", resourceUrl: lesson.resourceUrl || "" })),
  })) : lines(form.curriculumText).map((title) => ({ title }));
  return {
    ...Object.fromEntries(allowedFields.filter((key) => form[key] !== undefined).map((key) => [key, form[key]])),
    ...(instructor ? { instructor } : {}),
    priceMinor: Number(form.priceMinor),
    learningOutcomes: form.learningOutcomesText !== undefined ? lines(form.learningOutcomesText) : form.learningOutcomes || [],
    skills: form.skillsText !== undefined ? lines(form.skillsText) : form.skills || [],
    tools: form.toolsText !== undefined ? lines(form.toolsText) : form.tools || [],
    curriculum,
    projects: (form.projects || []).map((project, order) => ({ title: project.title, description: project.description || "", technologies: Array.isArray(project.technologies) ? project.technologies : lines(project.technologiesText), outcome: project.outcome || "", order })),
    faqs: (form.faqs || []).map((faq, order) => ({ question: faq.question, answer: faq.answer, order })),
  };
}
