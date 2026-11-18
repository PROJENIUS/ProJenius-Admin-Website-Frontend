import { useEffect, useRef, useState } from "react";
import { hasPermission } from "../../../utils/adminAccess";
import { buildCoursePayload } from "../../../utils/courseManagementForm";
import { getCourseEditorSectionStatuses, validateCourseForPublish } from "../../../utils/courseEditorValidation";
import CourseEditorSections from "./CourseEditorSections";
import CourseLivePreview from "./CourseLivePreview";
import CourseContentSettings from "./CourseContentSettings";
import { courseAdminImageUrl, downloadCourseReceipt, exportCourseReport, getCourseAnalytics, getEnrollmentDetails, listCommonCourseFaqs, listCourses, listCourseNotifications, listEnrollments, listPayments, listRefunds, retryCourseNotification, retryPaymentNotifications, saveCourse, setCourseState, uploadCourseImage } from "../../../services/courseManagementService";
import "./CourseManagement.css";

const blank = { title: "", slug: "", shortDescription: "", description: "", aboutContent: "", category: "", language: "", level: "", duration: "", deliveryMode: "online", sessionLength: "", sessionCount: "", courseValidity: "", priceMinor: "", listPriceMinor: null, premiumEligible: false, enrollmentOpen: true, audience: "", prerequisites: "", prerequisitesDeclared: false, noPrerequisites: false, prerequisiteDetails: { priorKnowledge: "", eligibility: "", equipment: "" }, experienceLevel: "", highlights: [], badgeType: "", customBadgeLabel: "", badges: [], instructor: { name: "", designation: "", bio: "", expertise: [], profileUrl: "" }, certificate: { available: false, description: "" }, learningOutcomes: [], skills: [], tools: [], curriculum: [], projects: [], reviews: [], relatedCourseIds: [], faqs: [] };
const money = (minor) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format((minor || 0) / 100);
const readable = (value) => String(value || "").replaceAll("_", " ");

export default function CourseManagement({ admin, onNavigate }) {
  const [tab, setTab] = useState("courses"), [courses, setCourses] = useState([]), [previewCourses, setPreviewCourses] = useState([]), [enrollments, setEnrollments] = useState([]), [payments, setPayments] = useState([]), [refunds, setRefunds] = useState([]), [notifications, setNotifications] = useState([]), [analytics, setAnalytics] = useState(null);
  const [preview, setPreview] = useState(null), [enrollmentDetail, setEnrollmentDetail] = useState(null);
  const [commonFaqs, setCommonFaqs] = useState([]);
  const [filters, setFilters] = useState({ page: 1, search: "", status: "", courseId: "", from: "", to: "" }), [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [form, setForm] = useState(blank), [editing, setEditing] = useState(null), [image, setImage] = useState(null), [savedCover, setSavedCover] = useState(null), [selectedPreviewUrl, setSelectedPreviewUrl] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [reloadKey, setReloadKey] = useState(0), [isDirty, setIsDirty] = useState(false);
  const [editorSection, setEditorSection] = useState("hero"), [publishIssues, setPublishIssues] = useState([]), [saving, setSaving] = useState(false);
  const selectedPreviewUrlRef = useRef("");
  const editorWorkspaceRef = useRef(null);
  const can = (permission) => hasPermission(admin, permission);
  const canManageSchedule = can("courses:schedule");
  const allowedTabs = ["courses", "enrollments", "payments", "notifications", "analytics", "refunds"].filter((key) => can(({ courses: "courses:list", enrollments: "courses:enrollments:view", payments: "courses:payments:view", notifications: "courses:notifications:view", analytics: "courses:analytics:view", refunds: "courses:refunds:view" })[key]));
  if (can("courses:view")) allowedTabs.push("content");
  const activeTab = allowedTabs.includes(tab) ? tab : allowedTabs[0] || "courses";
  const currentPublishIssues = validateCourseForPublish(form, { image, savedCover });
  const visiblePublishIssues = publishIssues.filter((previous) => currentPublishIssues.some((current) => current.section === previous.section && current.field === previous.field));
  const sectionStatuses = getCourseEditorSectionStatuses(form, { image, savedCover });
  const editingCourse = courses.find((course) => course._id === editing);
  const courseForEditCanPublish = Boolean(editing && can("courses:publish") && editingCourse?.status !== "published");
  const livePreviewImage = selectedPreviewUrl || (editing && savedCover ? courseAdminImageUrl(editing) : savedCover?.url || "");
  useEffect(() => {
    let active = true;
    const load = async () => {
    try {
      const params = { page: filters.page, search: filters.search, status: filters.status, courseId: filters.courseId, from: filters.from, to: filters.to };
      let result;
      if (activeTab === "courses" && hasPermission(admin, "courses:list")) { result = await listCourses(params); if (!active) return; setCourses(result.items || []); }
      if (activeTab === "enrollments" && hasPermission(admin, "courses:enrollments:view")) { result = await listEnrollments(params); if (!active) return; setEnrollments(result.items || []); if (hasPermission(admin, "courses:list")) { const courseResult = await listCourses({ limit: 100 }); if (!active) return; setCourses(courseResult.items || []); } }
      if (activeTab === "payments" && hasPermission(admin, "courses:payments:view")) { result = await listPayments(params); if (!active) return; setPayments(result.items || []); if (hasPermission(admin, "courses:list")) { const courseResult = await listCourses({ limit: 100 }); if (!active) return; setCourses(courseResult.items || []); } }
      if (activeTab === "notifications" && hasPermission(admin, "courses:notifications:view")) { result = await listCourseNotifications({ page: filters.page, status: filters.status }); if (!active) return; setNotifications(result.items || []); }
      if (activeTab === "refunds" && hasPermission(admin, "courses:refunds:view")) { result = await listRefunds(params); if (!active) return; setRefunds(result.items || []); }
      if (result?.pagination) setPagination(result.pagination);
      if (activeTab === "analytics" && hasPermission(admin, "courses:analytics:view")) { const data = await getCourseAnalytics({ from: filters.from, to: filters.to }); if (!active) return; setAnalytics(data.item); }
      setError("");
    } catch (e) { if (active) setError(e.message); } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [activeTab, admin, filters, reloadKey]);
  useEffect(() => {
    if (activeTab !== "courses" || !hasPermission(admin, "courses:view")) return undefined;
    let active = true;
    listCommonCourseFaqs().then((result) => { if (active) setCommonFaqs(result.items || []); }).catch(() => { if (active) setCommonFaqs([]); });
    return () => { active = false; };
  }, [activeTab, admin, reloadKey]);
  useEffect(() => {
    if (activeTab !== "courses" || !hasPermission(admin, "courses:list")) return undefined;
    let active = true;
    listCourses({ page: 1, limit: 100 }).then((result) => { if (active) setPreviewCourses(result.items || []); }).catch(() => { if (active) setPreviewCourses([]); });
    return () => { active = false; };
  }, [activeTab, admin, reloadKey]);
  const updateFilters = (updater) => { setLoading(true); setFilters(updater); };
  const hasUnsavedChanges = isDirty || Boolean(image);
  useEffect(() => () => { if (selectedPreviewUrlRef.current) URL.revokeObjectURL(selectedPreviewUrlRef.current); }, []);
  const selectImage = (file) => { if (selectedPreviewUrlRef.current) URL.revokeObjectURL(selectedPreviewUrlRef.current); selectedPreviewUrlRef.current = file ? URL.createObjectURL(file) : ""; setSelectedPreviewUrl(selectedPreviewUrlRef.current); setImage(file || null); if (file) setIsDirty(true); };
  const beginNewCourse = () => {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved course changes and start a new course?")) return;
    setPreview(null); setEditing(null); setEditorSection("hero"); setPublishIssues([]); setError(""); setNotice("");
    selectImage(null); setSavedCover(null); setForm(blank); setIsDirty(false);
  };
  const edit = (course) => {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved course changes and load this course?")) return;
    setPreview(null); setEditing(course._id); setEditorSection("hero"); setPublishIssues([]); selectImage(null); setSavedCover(course.coverImage || null);
    const nextForm = { ...blank, ...Object.fromEntries(["title","slug","shortDescription","description","aboutContent","category","language","level","duration","deliveryMode","sessionLength","sessionCount","courseValidity","priceMinor","listPriceMinor","premiumEligible","enrollmentOpen","audience","prerequisites","prerequisitesDeclared","noPrerequisites","prerequisiteDetails","experienceLevel","highlights","badgeType","customBadgeLabel","badges","internalCostMinor","instructor","certificate","learningOutcomes","skills","tools","curriculum","projects","reviews","relatedCourseIds","faqs"].filter((key) => course[key] !== undefined).map((key) => [key, course[key]])), premiumEligible: typeof course.premiumEligible === "boolean" ? course.premiumEligible : undefined, imageAlt: course.coverImage?.alt || "", learningOutcomesText: (course.learningOutcomes || []).join("\n"), skillsText: (course.skills || []).join("\n"), toolsText: (course.tools || []).join("\n"), highlightsText: (course.highlights || []).join("\n"), badgesText: (course.badges || []).join("\n"), badgeType: course.badgeType || (course.badges?.[0] ? "other" : ""), customBadgeLabel: course.customBadgeLabel || (course.badgeType ? "" : course.badges?.[0] || ""), curriculum: (course.curriculum || []).map((module) => ({ ...module, topics: module.topics || [], practicalActivities: module.practicalActivities || [], lessons: module.lessons || [] })), projects: (course.projects || []).map((project) => ({ ...project, technologiesText: (project.technologies || []).join("\n") })) };
    setForm(nextForm); setIsDirty(false); setNotice(""); setError("");
  };
  const updateForm = (updater) => { setIsDirty(true); setForm(updater); };
  const updateEntry = (field, index, changes) => { setError(""); updateForm((current) => ({ ...current, [field]: current[field].map((entry, position) => position === index ? { ...entry, ...changes } : entry) })); };
  const moveEntry = (field, index, direction) => updateForm((current) => { const values = [...current[field]]; const target = index + direction; if (target < 0 || target >= values.length) return current; [values[index], values[target]] = [values[target], values[index]]; return { ...current, [field]: values }; });
  const updateLesson = (moduleIndex, lessonIndex, changes) => { setError(""); updateForm((current) => ({ ...current, curriculum: current.curriculum.map((module, index) => index === moduleIndex ? { ...module, lessons: module.lessons.map((lesson, position) => position === lessonIndex ? { ...lesson, ...changes } : lesson) } : module) })); };
  const updateCurriculumChild = (moduleIndex, field, itemIndex, changes) => { setError(""); updateForm((current) => ({ ...current, curriculum: current.curriculum.map((module, index) => index === moduleIndex ? { ...module, [field]: (module[field] || []).map((item, position) => position === itemIndex ? { ...item, ...changes } : item) } : module) })); };
  const moveCurriculumChild = (moduleIndex, field, itemIndex, direction) => updateForm((current) => ({ ...current, curriculum: current.curriculum.map((module, index) => { if (index !== moduleIndex) return module; const values = [...(module[field] || [])]; const target = itemIndex + direction; if (target < 0 || target >= values.length) return module; [values[itemIndex], values[target]] = [values[target], values[itemIndex]]; return { ...module, [field]: values }; }) }));
  const moveLesson = (moduleIndex, lessonIndex, direction) => updateForm((current) => ({ ...current, curriculum: current.curriculum.map((module, index) => { if (index !== moduleIndex) return module; const lessons = [...module.lessons]; const target = lessonIndex + direction; if (target < 0 || target >= lessons.length) return module; [lessons[lessonIndex], lessons[target]] = [lessons[target], lessons[lessonIndex]]; return { ...module, lessons }; }) }));
  const setField = (field, value) => { setError(""); updateForm((current) => ({ ...current, [field]: value })); };
  const persistCourse = async (publish = false) => {
    if (saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = buildCoursePayload(form, { canManageSchedule, creating: !editing });
      const saved = await saveCourse(payload, editing);
      setEditing(saved.item._id);
      setSavedCover(saved.item.coverImage || savedCover);
      if (image) { const data = new FormData(); data.append("image", image); data.append("alt", form.imageAlt || ""); await uploadCourseImage(saved.item._id, data); }
      if (publish) await setCourseState(saved.item._id, "publish");
      setNotice(publish ? "Course published." : editing ? "Course changes saved." : "Course draft created."); setForm(blank); setIsDirty(false); setEditing(null); selectImage(null); setSavedCover(null); setPublishIssues([]); setEditorSection("hero"); setLoading(true); setReloadKey((value) => value + 1);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const submit = async (event) => { event.preventDefault(); await persistCourse(false); };
  const publishEdited = async () => {
    const issues = validateCourseForPublish(form, { image, savedCover });
    setPublishIssues(issues);
    if (issues.length) { setEditorSection(issues[0].section); setError("Complete the required course information before publishing."); return; }
    if (!window.confirm(`Publish “${form.title}”?`)) return;
    await persistCourse(true);
  };
  const changeState = async (course, action) => {
    if (action === "publish") {
      const issues = validateCourseForPublish(course, { savedCover: course.coverImage });
      if (issues.length) {
        if (can("courses:edit")) { edit(course); setPublishIssues(issues); setEditorSection(issues[0].section); setError("Complete the required course information before publishing."); }
        else setError(`This course needs attention before publishing: ${issues.map((issue) => issue.message).join(" ")}`);
        return;
      }
    }
    if (action !== "schedule" && !window.confirm(`${action[0].toUpperCase() + action.slice(1)} â€œ${course.title}â€?`)) return;
    const scheduledAt = action === "schedule" ? window.prompt("Enter a future publication date and time (ISO format):") : undefined;
    if (action === "schedule" && !scheduledAt) return;
    try { await setCourseState(course._id, action, scheduledAt); setNotice(`Course ${action} request completed.`); setLoading(true); setReloadKey((value) => value + 1); } catch (e) { setError(e.message); }
  };
  const download = async () => { try { const blob = await exportCourseReport(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "course-enrollments.csv"; link.click(); URL.revokeObjectURL(url); } catch (e) { setError(e.message); } };
  const downloadReceipt = async (id) => { try { const blob = await downloadCourseReceipt(id); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "course-receipt.pdf"; link.click(); URL.revokeObjectURL(url); } catch (e) { setError(e.message); } };
  const retryPaymentEmail = async (row) => {
    try { const result = await retryPaymentNotifications(row._id); setNotice(`Payment notification status: customer ${result.item.customerEmailStatus}; admin ${result.item.adminEmailStatus}.`); setReloadKey((value) => value + 1); }
    catch (e) { setError(e.message); }
  };
  const showEnrollmentDetails = async (row) => {
    try { const result = await getEnrollmentDetails(row._id); setEnrollmentDetail(result.item); }
    catch (e) { setError(e.message); }
  };

  if (!allowedTabs.length) return <section className="pa-course"><h1>Course Management</h1><p>You do not have a course-management permission.</p></section>;
  return <section className="pa-course">
    <header className="pa-course__heading"><div><span>LEARNING PRODUCTS</span><h1>Course Management</h1><p>Create, update, preview and manage your courses in one place.</p></div><div className="pa-course__heading-actions">{can("courses:create") && <button className="pa-course__primary" onClick={beginNewCourse}>+ Create New Course</button>}{can("courses:reports:export") && <button onClick={download}>Export enrolments CSV</button>}</div></header>
    <nav className="pa-course__tabs" aria-label="Course management sections">{allowedTabs.map((key) => <button className={activeTab === key ? "is-active" : ""} key={key} onClick={() => { setLoading(true); setTab(key); updateFilters((value) => ({ ...value, page: 1, status: "" })); }}>{key[0].toUpperCase() + key.slice(1)}</button>)}</nav>
    {activeTab !== "courses" && <CourseFilters activeTab={activeTab} filters={filters} updateFilters={updateFilters} courses={courses} canListCourses={can("courses:list")} />}    {error && <p className="pa-course__message is-error" role="alert">{error}</p>}{notice && <p className="pa-course__message" role="status">{notice}</p>}{loading && <p role="status">Loadingâ€¦</p>}
    {activeTab === "courses" && <div className="pa-course__workspace">
      {(can("courses:create") || (editing && can("courses:edit"))) && <section ref={editorWorkspaceRef} className="pa-course__editor-workspace" aria-labelledby="pa-course-editor-heading">
        <header className="pa-course__editor-heading"><div><span className="pa-course__status-pill">{editing ? readable(editingCourse?.status || "saved course") : "New course · not saved"}</span><h2 id="pa-course-editor-heading">{editing ? "Edit Course: " + (form.title || editingCourse?.title || "Untitled") : "Create New Course"}</h2><p>{hasUnsavedChanges ? "Unsaved changes" : "No unsaved changes"} · Drafts can be incomplete. Publishing requires all required sections.</p></div></header>
        <form className="pa-course__form" onSubmit={submit} noValidate>
          {/* Ten-section course form stays the single source of truth for save and preview. */}
          <CourseEditorSections form={form} setForm={updateForm} setField={setField} activeSection={editorSection} setActiveSection={setEditorSection} sections={sectionStatuses} issues={visiblePublishIssues} editId={editing} canManageSchedule={canManageSchedule} canUploadImage={can("courses:uploadImage")} canViewInternalCost={can("courses:analytics:view")} courses={previewCourses} updateEntry={updateEntry} moveEntry={moveEntry} updateLesson={updateLesson} moveLesson={moveLesson} updateCurriculumChild={updateCurriculumChild} moveCurriculumChild={moveCurriculumChild} selectImage={selectImage} selectedPreviewUrl={selectedPreviewUrl} savedCover={savedCover} coverUrl={editing ? courseAdminImageUrl(editing) : ""} setError={setError} />
          <div className="pa-course__actions pa-course-editor__actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save draft / changes" : "Save draft"}</button>{editing && courseForEditCanPublish && <button type="button" disabled={saving} onClick={publishEdited}>{saving ? "Saving…" : "Publish course"}</button>}{editing && <button type="button" disabled={saving} onClick={() => { if (hasUnsavedChanges && !window.confirm("Discard unsaved course changes?")) return; setEditing(null); setPublishIssues([]); setError(""); selectImage(null); setSavedCover(null); setForm(blank); setIsDirty(false); setEditorSection("hero"); }}>Cancel editing</button>}</div>
        </form>
        <CourseLivePreview form={form} imageUrl={livePreviewImage} courses={previewCourses} currentCourseId={editing} commonFaqs={commonFaqs} />
      </section>}
      <section className="pa-course__panel pa-course__existing" aria-labelledby="pa-course-existing-heading"><header className="pa-course__existing-heading"><div><span>DATABASE-BACKED LIST</span><h2 id="pa-course-existing-heading">Existing Courses</h2><p>Search and manage saved courses. Opening a course loads it into the editor and both live previews.</p></div></header>
        <CourseFilters activeTab="courses" filters={filters} updateFilters={updateFilters} courses={courses} canListCourses={can("courses:list")} />
        {courses.map((course) => <article className="pa-course__row" key={course._id}><div><strong>{course.title}</strong><span>{course.category} · {readable(course.status)} · {money(course.priceMinor)}</span></div><div className="pa-course__actions">{can("courses:view") && <button onClick={() => can("courses:edit") ? edit(course) : setPreview(course)}>{can("courses:edit") ? "View / Edit" : "View details"}</button>}{can("courses:publish") && course.status !== "published" && <button onClick={() => changeState(course, "publish")}>Publish</button>}{can("courses:schedule") && course.status !== "published" && <button onClick={() => changeState(course, "schedule")}>Schedule</button>}{can("courses:unpublish") && course.status === "published" && <button onClick={() => changeState(course, "unpublish")}>Unpublish</button>}{can("courses:archive") && course.status !== "archived" && <button onClick={() => changeState(course, "archive")}>Archive</button>}</div></article>)}
        {!courses.length && <p>{loading ? "Loading saved courses…" : "No courses match these filters."}</p>}{preview && <article className="pa-course__preview"><h3>{preview.title}</h3><p>{preview.shortDescription}</p><p>{preview.description}</p><p>{preview.duration} · {preview.deliveryMode} · {money(preview.priceMinor)}</p><button type="button" onClick={() => setPreview(null)}>Close details</button></article>}
        <div className="pa-course__pager">{pagination.pages > 1 && <><button disabled={pagination.page <= 1} onClick={() => updateFilters((value) => ({ ...value, page: value.page - 1 }))}>Previous</button><span>{pagination.page} / {pagination.pages} · {pagination.total} courses</span><button disabled={pagination.page >= pagination.pages} onClick={() => updateFilters((value) => ({ ...value, page: value.page + 1 }))}>Next</button></>}</div>
      </section>
    </div>}    {activeTab === "content" && <CourseContentSettings canEdit={can("courses:edit")} onNavigate={onNavigate} />}
    {activeTab === "enrollments" && <DataTable title="Registrations" rows={enrollments} pagination={pagination} onPage={(page) => updateFilters((value) => ({ ...value, page }))} onReceipt={can("courses:payments:view") ? downloadReceipt : undefined} renderActions={(row) => <>
      {can("courses:enrollments:details") && <button onClick={() => showEnrollmentDetails(row)}>Details</button>}
      {row.status === "enrolled" && (row.customerEmailStatus !== "sent" || row.adminEmailStatus !== "sent" || row.receiptStatus !== "ready") && can("courses:notifications:retry") && <button onClick={() => retryPaymentEmail(row)}>Retry payment notifications</button>}
    </>} columns={[["reference","Reference"],["courseSnapshot.title","Programme"],["student.name","Participant"],["student.email","Email"],["status","Payment status"],["student.preferredMode","Class mode"],["receiptStatus","Receipt"],["customerEmailStatus","Receipt email"],["adminEmailStatus","Admin alert"],["createdAt","Created"]]} />}
    {enrollmentDetail && activeTab === "enrollments" && <article className="pa-course__panel pa-course__detail"><div className="pa-course__detail-head"><h2>Registration {enrollmentDetail.reference}</h2><button onClick={() => setEnrollmentDetail(null)}>Close details</button></div><p><strong>Participant:</strong> {enrollmentDetail.student?.name} Â· {enrollmentDetail.student?.email} Â· {enrollmentDetail.student?.phone}</p>{enrollmentDetail.student?.preferredMode && <p><strong>Chosen class mode:</strong> {enrollmentDetail.student.preferredMode === "offline" ? "Offline" : "Online"}</p>}<p><strong>Programme:</strong> {enrollmentDetail.course?.title} Â· {enrollmentDetail.course?.deliveryMode} Â· {enrollmentDetail.course?.duration}</p><p><strong>Payment:</strong> {enrollmentDetail.payment?.status} Â· {enrollmentDetail.payment?.paymentId || "No payment ID"} Â· {enrollmentDetail.terms?.version} accepted {enrollmentDetail.terms?.acceptedAt ? new Date(enrollmentDetail.terms.acceptedAt).toLocaleString() : ""}</p><p><strong>Terms:</strong> {enrollmentDetail.terms?.policy}</p>{enrollmentDetail.refunds?.length > 0 && <p><strong>Refunds:</strong> {enrollmentDetail.refunds.map((refund) => `${refund.status} ${money(refund.amountMinor)} Â· ${refund.providerRefundId || "pending provider ID"}`).join("; ")}</p>}</article>}
    {activeTab === "payments" && <DataTable title="Payments" rows={payments} pagination={pagination} onPage={(page) => updateFilters((value) => ({ ...value, page }))} columns={[["orderId","Order"],["paymentId","Payment"],["enrollmentId.reference","Reference"],["amountMinor","Amount"],["status","Status"],["gatewayStatus","Gateway"],["attempts","Earlier attempts"]]} />}
    {activeTab === "refunds" && <DataTable title="Provider refund events" rows={refunds} pagination={pagination} onPage={(page) => updateFilters((value) => ({ ...value, page }))} columns={[["providerRefundId","Provider refund"],["enrollmentId.reference","Reference"],["amountMinor","Amount"],["status","Status"],["createdAt","Recorded"]]} />}
    {activeTab === "notifications" && <DataTable title="Notification delivery queue" rows={notifications} pagination={pagination} onPage={(page) => updateFilters((value) => ({ ...value, page }))} renderActions={(row) => can("courses:notifications:retry") && ["failed","not_configured"].includes(row.status) ? <button onClick={async () => { try { await retryCourseNotification(row._id); setNotice("Notification retry queued."); setReloadKey((value) => value + 1); } catch (e) { setError(e.message); } }}>Retry</button> : null} columns={[["type","Notification"],["recipient","Recipient"],["status","Status"],["attempts","Attempts"],["lastAttemptAt","Last attempt"],["nextRetryAt","Next retry"],["lastError","Last error"],["enrollmentId.reference","Reference"]]} />}
    {activeTab === "analytics" && analytics && <>
      <div className="pa-course__metrics">{[["Total courses",analytics.courses.total],["Draft",analytics.courses.draft],["Scheduled",analytics.courses.scheduled],["Published",analytics.courses.published],["Archived",analytics.courses.archived],["Enrolled",analytics.enrolments.enrolled],["Pending enrolments",analytics.enrolments.pending],["Captured payments",analytics.payments.captured],["Pending payments",analytics.payments.pending],["Failed payments",analytics.payments.failed],["Gross captured",money(analytics.payments.grossCapturedMinor)],["Refunded",money(analytics.payments.refundedMinor)],["Refund-adjusted",money(analytics.payments.refundAdjustedMinor)],["Estimated net after reported fees",money(analytics.payments.estimatedNetAfterReportedFeesMinor)]].map(([label,value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}<p>{analytics.payments.gatewayFeeCoverage}</p></div>
      <div className="pa-course__panel"><h2>Course performance</h2><div className="pa-course__table-wrap"><table><thead><tr>{["Course","State","Enrolments","Captured","Pending","Failed","Success rate","Gross captured","Refunded","Refund-adjusted","Reported fees","Internal cost","Contribution estimate"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{analytics.courseWise.map((row) => <tr key={row._id}><td>{row.title}</td><td>{row.status}</td><td>{row.enrolments}</td><td>{row.capturedPayments}</td><td>{row.pendingPayments}</td><td>{row.failedPayments}</td><td>{row.paymentSuccessRate}%</td><td>{money(row.grossMinor)}</td><td>{money(row.refundedMinor)}</td><td>{money(row.refundAdjustedMinor)}</td><td>{money(row.gatewayFeeMinor)}</td><td>{row.internalCostMinor == null ? "Not entered" : money(row.internalCostMinor)}</td><td>{row.estimatedContributionMinor == null ? "Unavailable: enter cost" : money(row.estimatedContributionMinor)}</td></tr>)}</tbody></table></div><p>Contribution estimate = gross captured minus processed refunds, reported gateway fees and entered internal cost. This is not accounting profit. Date filters apply to enrolment and payment order creation dates; lifecycle totals remain all-time.</p></div>
    </>}
  </section>;
}

function CourseFilters({ activeTab, filters, updateFilters, courses, canListCourses }) {
  return <div className="pa-course__filters">
    {activeTab !== "analytics" && <label>Search<input value={filters.search} onChange={(event) => updateFilters((value) => ({ ...value, page: 1, search: event.target.value }))} placeholder={activeTab === "courses" ? "Title, slug or category" : activeTab === "refunds" ? "Provider refund ID" : "Reference or payment ID"} /></label>}
    {activeTab !== "analytics" && <label>{activeTab === "enrollments" ? "Payment status" : "Status"}<select value={filters.status} onChange={(event) => updateFilters((value) => ({ ...value, page: 1, status: event.target.value }))}><option value="">All statuses</option>{(activeTab === "courses" ? ["draft","scheduled","published","unpublished","archived"] : activeTab === "enrollments" ? ["pending_payment","enrolled","payment_failed","cancelled","refunded"] : activeTab === "refunds" ? ["requested","pending","processed","failed"] : activeTab === "notifications" ? ["queued","processing","sent","failed","not_configured"] : ["created","pending","authorized","captured","failed","cancelled","refunded","partially_refunded"]).map((value) => <option key={value} value={value}>{readable(value)}</option>)}</select></label>}
    {["enrollments","payments"].includes(activeTab) && canListCourses && <label>Course<select value={filters.courseId} onChange={(event) => updateFilters((value) => ({ ...value, page: 1, courseId: event.target.value }))}><option value="">All courses</option>{courses.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label>}
    {["analytics","enrollments","payments","refunds"].includes(activeTab) && <><label>From<input type="date" value={filters.from} onChange={(event) => updateFilters((value) => ({ ...value, from: event.target.value }))} /></label><label>To<input type="date" value={filters.to} onChange={(event) => updateFilters((value) => ({ ...value, to: event.target.value }))} /></label></>}
  </div>;
}

function DataTable({ title, rows, columns, pagination, onPage, onReceipt, renderActions }) {
  const value = (row, key) => key.split(".").reduce((object, part) => object?.[part], row);
  const statusTone = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (["failed", "payment_failed", "rejected", "cancelled"].includes(normalized)) return "failed";
    if (["sent", "ready", "enrolled", "captured", "processed", "published"].includes(normalized)) return "success";
    if (["pending", "queued", "processing", "created", "authorized", "requested", "scheduled", "partially_refunded"].includes(normalized)) return "pending";
    if (["not_configured", "unavailable"].includes(normalized)) return "muted";
    return "neutral";
  };
  const display = (row, key) => {
    const item = value(row, key);
    if (key === "amountMinor") return money(item);
    if (key === "attempts") return Array.isArray(item) && item.length ? item.map((attempt) => `${attempt.status} Â· ${new Date(attempt.recordedAt).toLocaleString()}`).join("; ") : "â€”";
    if (key.endsWith("At") && item) return new Date(item).toLocaleString();
    if (["status", "receiptStatus", "customerEmailStatus", "adminEmailStatus", "gatewayStatus"].includes(key) && item) {
      const tone = statusTone(item);
      return <span className={`pa-course__delivery-status is-${tone}`} title={`${key.replace(/([A-Z])/g, " $1")}: ${readable(String(item))}`}>{readable(String(item))}</span>;
    }
    return String(item ?? "â€”");
  };
  return <div className="pa-course__panel"><h2>{title}</h2><div className="pa-course__table-wrap"><table><thead><tr>{columns.map(([,label]) => <th key={label}>{label}</th>)}{onReceipt && <th>Receipt</th>}{renderActions && <th>Actions</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row._id}>{columns.map(([key]) => <td key={key}>{display(row,key)}</td>)}{onReceipt && <td><button onClick={() => onReceipt(row._id)}>Download</button></td>}{renderActions && <td><div className="pa-course__actions">{renderActions(row)}</div></td>}</tr>)}</tbody></table></div>{!rows.length && <p>No records found.</p>}{pagination?.pages > 1 && <div className="pa-course__pager"><button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button><span>{pagination.page} / {pagination.pages} Â· {pagination.total} records</span><button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>Next</button></div>}</div>;
}

