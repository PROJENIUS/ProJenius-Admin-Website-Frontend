import { useMemo, useState } from "react";
import { buildCoursePreviewModel, renderSafeCourseAbout } from "../../../utils/coursePreviewModel.js";
import { courseAdminImageUrl } from "../../../services/courseManagementService.js";
import "./CourseLivePreview.css";

const inr = (minor) => minor == null
  ? "Set offer price"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(minor / 100);
const experienceLabel = (value) => ({ "beginner-friendly": "Beginner-friendly", "prior-experience": "Prior experience required", "all-levels": "All levels" }[value] || "");
const levelLabel = (form) => experienceLabel(form.experienceLevel) || ({ beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" }[form.level] || "");
const deliveryLabel = (value) => ({ online: "Online", "in-person": "Offline", hybrid: "Online & offline", "self-paced": "Online" }[value] || "");
/* Same six "This course includes" boxes as the website course page. */
function includesFor(model) {
  const activities = model.curriculum.reduce((n, m) => n + (m.practicalActivities?.length || 0), 0);
  return [
    { title: "Portfolio projects", text: model.projects.length ? `${model.projects.length} project${model.projects.length === 1 ? "" : "s"} you build and keep for your portfolio.` : "A project you build and keep for your portfolio." },
    { title: "Hands-on practice", text: activities ? `${activities} practical activit${activities === 1 ? "y" : "ies"} across the modules.` : "Practice tasks in every module." },
    model.certificate.available && { title: "Certificate", text: "Awarded on completion of the course." },
    { title: "Career guidance", text: "Placement tips, resume and LinkedIn profile help." },
    { title: "Mock interviews", text: "Practice interviews with feedback before you apply." },
    { title: "Team support", text: "Our team contacts you by phone after registration and stays in touch." },
    model.courseValidity && { title: "Programme period", text: model.courseValidity },
  ].filter(Boolean).slice(0, 6);
}

const PreviewImage = ({ src, alt }) => src ? <img src={src} alt={alt} crossOrigin={src.startsWith("blob:") ? undefined : "use-credentials"} /> : null;

export default function CourseLivePreview({ form, imageUrl, courses, currentCourseId, commonFaqs }) {
  const [view, setView] = useState("card");
  const [device, setDevice] = useState("desktop");
  const model = useMemo(() => buildCoursePreviewModel(form, { imageUrl, courses, currentCourseId, commonFaqs }), [form, imageUrl, courses, currentCourseId, commonFaqs]);
  const aboutNodes = useMemo(() => renderSafeCourseAbout(model.aboutContent), [model.aboutContent]);
  const purchaseCard = <aside className="pa-course-preview__purchase" aria-label="Purchase card preview">
    <div className="pa-course-preview__purchase-image">{model.coverUrl ? <PreviewImage src={model.coverUrl} alt={model.imageAlt} /> : <span>Course image not added</span>}</div>
    <div className="pa-course-preview__enrolling"><span>You are enrolling in</span><strong>{model.title || "Course title"}</strong>{[model.category, deliveryLabel(model.deliveryMode), model.duration].filter(Boolean).length > 0 && <small>{[model.category, deliveryLabel(model.deliveryMode), model.duration].filter(Boolean).join(" · ")}</small>}</div>
    <div className="pa-course-preview__price"><strong>{inr(model.priceMinor)}</strong>{model.discountPercent !== null && <><del>{inr(model.listPriceMinor)}</del><span>{model.discountPercent}% off</span></>}</div>
    <button type="button" disabled aria-label="Preview only. Purchase is unavailable">{model.priceMinor == null ? "Pay securely" : `Pay ${inr(model.priceMinor)} securely`}</button>
    <ul>{model.duration && <li>{model.duration}</li>}{model.moduleCount > 0 && <li>{model.moduleCount} modules</li>}{model.certificate.available && <li>Certificate available</li>}{model.courseValidity && <li>{model.courseValidity}</li>}</ul>
    <a className="pa-course-preview__terms" href="#pa-course-preview-terms" onClick={(event) => event.preventDefault()}>Terms &amp; Conditions</a>
  </aside>;

  return <section className="pa-course-preview" aria-label="Live course preview">
    <header className="pa-course-preview__toolbar"><div><span className="pa-course-preview__eyebrow">LIVE PREVIEW</span><h3>Preview the official course presentation</h3><p>Updates from the current form. Nothing is saved, published, or submitted from this preview.</p></div>
      <div className="pa-course-preview__controls" role="group" aria-label="Preview type">
        <button type="button" aria-pressed={view === "card"} onClick={() => setView("card")}>Course Card Preview</button>
        <button type="button" aria-pressed={view === "detail"} onClick={() => setView("detail")}>Course Detail Preview</button>
      </div>
    </header>

    {view === "card" ? <div className="pa-course-preview__card-stage">
      <p className="pa-course-preview__mode">Course card · preview only</p>
      <article className="pa-course-preview__card">
        <div className="pa-course-preview__card-media">{model.coverUrl ? <PreviewImage src={model.coverUrl} alt={model.imageAlt} /> : <span>Course thumbnail preview</span>}{model.badgeLabel && <span className="pa-course-preview__badge">{model.badgeLabel}</span>}{model.rating !== null && <span className="pa-course-preview__card-rating" aria-label={`${model.rating} out of 5 from ${model.reviewCount} published reviews`}>★ {model.rating}</span>}</div>
        <div className="pa-course-preview__card-body">
          {model.category && <span className="pa-course-preview__category">{model.category}</span>}
          <h4>{model.title || <span className="pa-course-preview__placeholder">Course title</span>}</h4>
          <p className="pa-course-preview__description">{model.shortDescription || <span className="pa-course-preview__placeholder">Short description</span>}</p>
          <div className="pa-course-preview__stats">{model.duration && <span>{model.duration}</span>}{model.deliveryMode && <span>{deliveryLabel(model.deliveryMode)}</span>}{model.moduleCount > 0 && <span>{model.moduleCount} modules</span>}</div>
          <div className="pa-course-preview__card-foot"><strong>{inr(model.priceMinor)}</strong>{model.discountPercent !== null && <><del>{inr(model.listPriceMinor)}</del><span>{model.discountPercent}% off</span></>}<button type="button" aria-label="View course preview only" disabled>↗</button></div>
        </div>
      </article>
    </div> : <div className="pa-course-preview__detail-stage">
      <div className="pa-course-preview__device-controls" role="group" aria-label="Course detail preview size">
        <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop Preview</button>
        <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile Preview</button>
        <span>{device === "desktop" ? "Desktop width" : "Mobile width"} · preview only</span>
      </div>
      <div className={`pa-course-preview__detail-viewport is-${device}`}>
        <div className="pa-course-preview__hero">
          <div className="pa-course-preview__hero-copy">
            {model.category && <p className="pa-course-preview__hero-category">{model.category}</p>}
            <h2>{model.title || <span className="pa-course-preview__placeholder">Course title</span>}</h2>
            <p className="pa-course-preview__hero-description">{model.shortDescription || <span className="pa-course-preview__placeholder">Short description</span>}</p>
            {model.badgeLabel && <div className="pa-course-preview__hero-badges"><span>{model.badgeLabel}</span></div>}
            {model.rating !== null && <p className="pa-course-preview__hero-rating">★ {model.rating} · {model.reviewCount} published reviews</p>}
            <div className="pa-course-preview__hero-meta">{model.duration && <span>{model.duration}</span>}{levelLabel(form) && <span>{levelLabel(form)}</span>}{model.deliveryMode && <span>{deliveryLabel(model.deliveryMode)}</span>}{model.moduleCount > 0 && <span>{model.moduleCount} modules</span>}</div>
            <button type="button" disabled className="pa-course-preview__enroll">Enroll preview · {inr(model.priceMinor)}</button>
            <small>Preview only · No checkout or payment is available here</small>
          </div>
          <div className="pa-course-preview__hero-image">{model.coverUrl ? <PreviewImage src={model.coverUrl} alt={model.imageAlt} /> : <span>Course thumbnail not added</span>}</div>
        </div>
        <div className="pa-course-preview__facts">{[[model.duration, "Duration"], [model.moduleCount || "", "Modules"], [model.topicCount || "", "Activities"], [deliveryLabel(model.deliveryMode), "Format"], [String(form.language || "").trim(), "Language"], [levelLabel(form), "Level"]].filter(([value]) => value !== "").map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <div className="pa-course-preview__detail-layout">
          <article className="pa-course-preview__content">
            <nav aria-label="Preview course detail sections">{[["about", "Overview"], ["modules", "Curriculum"], ["projects", "Projects"], ["includes", "Includes"], ["reviews", "Reviews"], ["faq", "FAQs"]].map(([id, label]) => <a key={id} href={`#pa-preview-${id}`} onClick={(event) => event.preventDefault()}>{label}</a>)}</nav>
            <section id="pa-preview-about"><h3>About this course</h3><div className="pa-course-preview__rich">{aboutNodes || <span className="pa-course-preview__placeholder">Add About This Course content</span>}</div>{model.highlights.length > 0 && <><h4>Course highlights</h4><ul>{model.highlights.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></>}{String(form.description || "").trim() && <p>{form.description}</p>}{model.certificate.available && <p className="pa-course-preview__callout"><strong>Certificate available</strong>{model.certificate.description && ` · ${model.certificate.description}`}</p>}</section>
            {model.outcomes.length > 0 && <section id="pa-preview-outcomes"><h3>What you’ll learn</h3><ul className="pa-course-preview__checks">{model.outcomes.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
            {model.curriculum.length > 0 && <section id="pa-preview-modules"><h3>Course content · {model.moduleCount} modules · {model.topicCount} topics and activities</h3><div className="pa-course-preview__modules">{model.curriculum.map((module, index) => <details key={module._id || `${index}-${module.title}`} open={index === 0}><summary>Module {index + 1}: {module.title || "Untitled module"}{module.duration && <span>{module.duration}</span>}</summary>{module.description && <p>{module.description}</p>}{(module.topics || []).length > 0 && <><h4>Topics</h4><ol>{module.topics.map((item, itemIndex) => <li key={item._id || `${itemIndex}-${item.title}`}>{item.title}{item.description && <p>{item.description}</p>}</li>)}</ol></>}{(module.lessons || []).length > 0 && <><h4>Lessons</h4><ol>{module.lessons.map((item, itemIndex) => <li key={item._id || `${itemIndex}-${item.title}`}>{item.title}{item.summary && <p>{item.summary}</p>}</li>)}</ol></>}{(module.practicalActivities || []).length > 0 && <><h4>Practical activities</h4><ul>{module.practicalActivities.map((item, itemIndex) => <li key={item._id || `${itemIndex}-${item.title}`}>{item.title}{item.description && <p>{item.description}</p>}</li>)}</ul></>}</details>)}</div></section>}
            {model.projects.length > 0 && <section id="pa-preview-projects"><h3>Projects you’ll build</h3><div className="pa-course-preview__tiles">{model.projects.map((project, index) => <article key={project._id || `${index}-${project.title}`}><strong>{project.title}</strong>{project.description && <p>{project.description}</p>}</article>)}</div></section>}
            <section id="pa-preview-includes"><h3>This course includes</h3><p className="pa-course-preview__note">Shown the same way on the website. Built from your projects, activities and certificate choice.</p><ul className="pa-course-preview__includes">{includesFor(model).map((item) => <li key={item.title}><strong>{item.title}</strong><span>{item.text}</span></li>)}</ul></section>
            {model.reviews.length > 0 && <section id="pa-preview-reviews"><h3>Reviews and testimonials · {model.rating} / 5</h3><p>{model.reviewCount} published reviews · based on current form values</p>{model.reviews.map((review, index) => <blockquote key={review._id || `${index}-${review.studentName}`}><strong>{"★".repeat(Number(review.rating))}</strong><p>{review.testimonial}</p><cite>{review.studentName}</cite></blockquote>)}</section>}
            {model.relatedCourses.length > 0 && <section id="pa-preview-related"><h3>Related courses</h3><div className="pa-course-preview__related">{model.relatedCourses.map((course) => <article key={course._id}>{course.coverImage && <PreviewImage src={courseAdminImageUrl(course._id)} alt={course.coverImage.alt || course.title} />}<span>{course.category}</span><strong>{course.title}</strong><p>{course.shortDescription}</p><b>{inr(course.priceMinor)}</b></article>)}</div></section>}
            {model.faqs.length > 0 && <section id="pa-preview-faq"><h3>Frequently asked questions</h3><div className="pa-course-preview__modules">{model.faqs.slice(0, 6).map((faq, index) => <details key={faq._id || `${index}-${faq.question}`} open={index === 0}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>{model.faqs.length > 6 && <span className="pa-course-preview__view-all">View all {model.faqs.length} questions</span>}</section>}
          </article>
          {purchaseCard}
        </div>
      </div>
    </div>}
  </section>;
}
