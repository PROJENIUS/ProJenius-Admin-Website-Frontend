import { useEffect, useMemo, useState } from "react";
import {
  getLegalDocument,
  saveLegalDocument,
} from "../../../services/legalManagementService";

const DOCUMENT_LABELS = {
  terms: "Terms & Conditions",
  "privacy-policy": "Privacy Policy",
  "course-terms": "Course Terms",
};

function editableShape(item) {
  return {
    title: item.title || "",
    introduction: item.introduction || "",
    sections: (item.sections || []).map((section, order) => ({
      heading: section.heading || section.title || "",
      body: section.body || section.content || "",
      order,
    })),
  };
}

function formatDate(value) {
  if (!value) return "Not published yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function getStatusMessage({ isDraft, isProvisional, lastUpdated }) {
  if (isDraft) {
    return `An existing saved course-terms draft is loaded (${formatDate(lastUpdated)}). Saving here publishes it for future checkouts.`;
  }

  if (isProvisional) {
    return "Provisional starter copy. The public page marks it as provisional until an authorized editor saves it.";
  }

  return `Last saved: ${formatDate(lastUpdated)}`;
}

function getPreviewStatus({ isDraft, isProvisional, lastUpdated }) {
  if (isDraft) return "Saved draft · not public";
  if (isProvisional) return "Provisional · not saved";
  return `Last saved: ${formatDate(lastUpdated)}`;
}

export default function LegalManagement({
  activePath,
  canEdit,
  onDirtyChange,
}) {
  const documentKey = activePath.split("/").at(-1);
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isProvisional, setIsProvisional] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const dirty = useMemo(() => (
    Boolean(form && original && JSON.stringify(form) !== JSON.stringify(original))
  ), [form, original]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let active = true;

    getLegalDocument(documentKey)
      .then(({ item }) => {
        if (!active) return;

        const next = editableShape(item);
        setForm(next);
        setOriginal(next);
        setLastUpdated(item.lastUpdated || null);
        setIsProvisional(Boolean(item.isProvisional));
        setIsDraft(Boolean(item.isDraft));
        setError("");
        setNotice("");
        setLoadedKey(documentKey);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setLoadedKey(documentKey);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [documentKey]);

  useEffect(() => {
    if (!dirty) return undefined;

    function warnBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setNotice("");
  }

  function updateSection(index, name, value) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, position) => (
        position === index ? { ...section, [name]: value } : section
      )),
    }));
    setNotice("");
  }

  function moveSection(index, offset) {
    setForm((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.sections.length) return current;

      const sections = current.sections.slice();
      [sections[index], sections[target]] = [sections[target], sections[index]];

      return {
        ...current,
        sections: sections.map((section, order) => ({ ...section, order })),
      };
    });
    setNotice("");
  }

  function removeSection(index) {
    const confirmed = window.confirm(
      "Remove this section from the document? It will only be removed from the saved copy after you save.",
    );
    if (!confirmed) return;

    setForm((current) => ({
      ...current,
      sections: current.sections
        .filter((_, position) => position !== index)
        .map((section, order) => ({ ...section, order })),
    }));
    setNotice("");
  }

  async function reload() {
    const discardChanges = dirty && window.confirm(
      "Discard your unsaved legal document changes and reload the saved version?",
    );
    if (dirty && !discardChanges) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { item } = await getLegalDocument(documentKey);
      const next = editableShape(item);
      setForm(next);
      setOriginal(next);
      setLastUpdated(item.lastUpdated || null);
      setIsProvisional(Boolean(item.isProvisional));
      setIsDraft(Boolean(item.isDraft));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!canEdit || saving || !form) return;

    const hasEmptyField = !form.title.trim()
      || !form.introduction.trim()
      || !form.sections.length
      || form.sections.some((section) => (
        !section.heading.trim() || !section.body.trim()
      ));

    if (hasEmptyField) {
      setError(
        "Enter a title, introduction, and a heading and body for every section before saving.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,
        sections: form.sections.map((section, order) => ({
          ...section,
          order,
        })),
      };
      const result = await saveLegalDocument(documentKey, payload);
      const saved = editableShape(result.item);

      setForm(saved);
      setOriginal(saved);
      setLastUpdated(result.item.lastUpdated || null);
      setIsProvisional(false);
      setIsDraft(false);
      setNotice(result.unchanged
        ? "No changes to save. The published content and date are unchanged."
        : "Saved successfully. The public legal page now shows this version.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const documentLoading = loading || loadedKey !== documentKey;
  const currentForm = loadedKey === documentKey ? form : null;
  const currentError = loadedKey === documentKey ? error : "";
  const currentNotice = loadedKey === documentKey ? notice : "";
  const statusMessage = getStatusMessage({
    isDraft,
    isProvisional,
    lastUpdated,
  });
  const previewStatus = getPreviewStatus({
    isDraft,
    isProvisional,
    lastUpdated,
  });

  return (
    <section
      className="pa-legal-editor"
      aria-labelledby="pa-legal-editor-title"
    >
      <header className="pa-legal-editor__toolbar">
        <div>
          <h2 id="pa-legal-editor-title">
            {DOCUMENT_LABELS[documentKey] || "Legal document"}
          </h2>
          <p>Saved content is shown publicly after the server confirms a save.</p>
        </div>
        <div className="pa-legal-editor__toolbar-actions">
          <button
            type="button"
            onClick={reload}
            disabled={documentLoading || saving}
          >
            Reload saved version
          </button>
          {canEdit && (
            <button
              type="submit"
              form="pa-legal-editor-form"
              disabled={documentLoading || saving || (!dirty && !isProvisional)}
            >
              {saving ? "Saving…" : isProvisional ? "Save and publish" : "Save changes"}
            </button>
          )}
        </div>
      </header>

      <p className={isProvisional
        ? "pa-legal-editor__provisional"
        : "pa-legal-editor__saved-date"}
      >
        {statusMessage}
      </p>
      {documentLoading && <p role="status">Loading saved legal content…</p>}
      {currentError && (
        <p className="pa-legal-editor__error" role="alert">{currentError}</p>
      )}
      {currentNotice && (
        <p className="pa-legal-editor__success" role="status">{currentNotice}</p>
      )}

      {currentForm && (
        <div className="pa-legal-editor__grid">
          <form
            id="pa-legal-editor-form"
            className="pa-legal-editor__form"
            onSubmit={submit}
          >
            <label>
              Page title
              <input
                value={currentForm.title}
                maxLength={160}
                disabled={!canEdit || documentLoading || saving}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </label>
            <label>
              Introduction
              <textarea
                value={currentForm.introduction}
                maxLength={4000}
                rows={4}
                disabled={!canEdit || documentLoading || saving}
                onChange={(event) => updateField("introduction", event.target.value)}
              />
            </label>

            <div className="pa-legal-editor__section-heading">
              <h3>Ordered sections</h3>
              {canEdit && (
                <button
                  type="button"
                  disabled={currentForm.sections.length >= 20 || saving}
                  onClick={() => updateField("sections", [
                    ...currentForm.sections,
                    {
                      heading: "",
                      body: "",
                      order: currentForm.sections.length,
                    },
                  ])}
                >
                  Add section
                </button>
              )}
            </div>

            {currentForm.sections.map((section, index) => (
              <fieldset
                className="pa-legal-editor__section"
                key={`edit-${index}`}
                disabled={!canEdit || saving}
              >
                <legend>Section {index + 1}</legend>
                <label>
                  Heading
                  <input
                    value={section.heading}
                    maxLength={160}
                    onChange={(event) => updateSection(
                      index,
                      "heading",
                      event.target.value,
                    )}
                  />
                </label>
                <label>
                  Body
                  <textarea
                    value={section.body}
                    maxLength={5000}
                    rows={6}
                    onChange={(event) => updateSection(
                      index,
                      "body",
                      event.target.value,
                    )}
                  />
                </label>
                {canEdit && (
                  <div className="pa-legal-editor__section-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveSection(index, -1)}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      disabled={index === currentForm.sections.length - 1}
                      onClick={() => moveSection(index, 1)}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => removeSection(index)}
                    >
                      Remove section
                    </button>
                  </div>
                )}
              </fieldset>
            ))}
          </form>

          <aside
            className="pa-legal-editor__preview"
            aria-label="Unsaved legal document preview"
          >
            <h3>Preview</h3>
            <h4>{currentForm.title || "Untitled document"}</h4>
            <p className="pa-legal-editor__preview-date">{previewStatus}</p>
            <p>{currentForm.introduction}</p>
            {currentForm.sections.map((section, index) => (
              <section key={`preview-${index}`}>
                <h5>{index + 1}. {section.heading || "Untitled section"}</h5>
                <p>{section.body || "Section content preview"}</p>
              </section>
            ))}
          </aside>
        </div>
      )}

      {!canEdit && !documentLoading && currentForm && (
        <p className="pa-legal-editor__read-only">
          You can view this document but do not have permission to edit it.
        </p>
      )}
    </section>
  );
}
