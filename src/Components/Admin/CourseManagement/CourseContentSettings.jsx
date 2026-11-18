import { useEffect, useState } from "react";
import { deleteCommonCourseFaq, listCommonCourseFaqs, saveCommonCourseFaq } from "../../../services/courseManagementService";

export default function CourseContentSettings({ canEdit, onNavigate }) {
  const [tab, setTab] = useState("faqs");
  const [faqs, setFaqs] = useState([]);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", order: 0, published: false });
  const [editingFaq, setEditingFaq] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listCommonCourseFaqs().then((faqResult) => {
      if (!active) return;
      setFaqs(faqResult.items || []);
    }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  async function saveFaq(event) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await saveCommonCourseFaq(faqForm, editingFaq);
      setFaqs((items) => editingFaq ? items.map((item) => item._id === editingFaq ? result.item : item) : [...items, result.item].sort((a, b) => a.order - b.order));
      setFaqForm({ question: "", answer: "", order: faqs.length, published: false }); setEditingFaq(null); setNotice("Common FAQ saved.");
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function removeFaq(id) {
    if (!window.confirm("Permanently delete this common FAQ?")) return;
    setBusy(true); setError("");
    try { await deleteCommonCourseFaq(id); setFaqs((items) => items.filter((item) => item._id !== id)); setNotice("Common FAQ deleted."); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <section className="pa-course-content">
    <header><h2>Course content settings</h2><p>Manage shared course FAQs. Course terms are managed with the other legal documents.</p></header>
    {error && <p className="pa-course__message is-error" role="alert">{error}</p>}{notice && <p className="pa-course__message" role="status">{notice}</p>}
    <nav className="pa-course-content__tabs" aria-label="Course content settings"><button type="button" aria-pressed={tab === "faqs"} onClick={() => setTab("faqs")}>Common FAQs</button><button type="button" aria-pressed={tab === "policy"} onClick={() => setTab("policy")}>Terms &amp; Conditions</button></nav>
    {tab === "faqs" ? <div className="pa-course-content__layout">
      <div className="pa-course__panel"><h3>Shared FAQs</h3>{faqs.map((faq) => <article className="pa-course-content__faq" key={faq._id}><div><strong>{faq.question}</strong><p>{faq.answer}</p><small>{faq.published ? "Published" : "Draft"} · order {faq.order}</small></div><div className="pa-course__actions"><button type="button" disabled={!canEdit || busy} onClick={() => { setEditingFaq(faq._id); setFaqForm({ question: faq.question, answer: faq.answer, order: faq.order, published: faq.published }); }}>Edit</button><button type="button" disabled={!canEdit || busy} onClick={() => removeFaq(faq._id)}>Delete</button></div></article>)}</div>
      <form className="pa-course__panel pa-course-content__form" onSubmit={saveFaq}><h3>{editingFaq ? "Edit common FAQ" : "Add common FAQ"}</h3><label>Question<input required maxLength="300" value={faqForm.question} disabled={!canEdit || busy} onChange={(event) => setFaqForm({ ...faqForm, question: event.target.value })} /></label><label>Answer<textarea required maxLength="1500" rows="5" value={faqForm.answer} disabled={!canEdit || busy} onChange={(event) => setFaqForm({ ...faqForm, answer: event.target.value })} /></label><label>Display order<input type="number" min="0" value={faqForm.order} disabled={!canEdit || busy} onChange={(event) => setFaqForm({ ...faqForm, order: Number(event.target.value) })} /></label><label className="pa-course-content__check"><input type="checkbox" checked={faqForm.published} disabled={!canEdit || busy} onChange={(event) => setFaqForm({ ...faqForm, published: event.target.checked })} /> Publish this FAQ</label>{canEdit && <div className="pa-course__actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save FAQ"}</button>{editingFaq && <button type="button" disabled={busy} onClick={() => { setEditingFaq(null); setFaqForm({ question: "", answer: "", order: faqs.length, published: false }); }}>Cancel edit</button>}</div>}</form>
    </div> : <section className="pa-course__panel pa-course-content__policy"><h3>Course Terms</h3><p>Manage the complete course purchase terms in the Legal Pages editor. The saved document version is used by checkout, and each accepted version remains recorded with its registration.</p><button type="button" onClick={() => onNavigate?.("/legal/course-terms")}>Open Course Terms editor</button></section>}
  </section>;
}
