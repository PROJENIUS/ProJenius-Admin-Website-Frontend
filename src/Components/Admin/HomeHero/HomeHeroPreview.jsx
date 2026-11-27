/* =========================================================
   HOME HERO — LIVE PREVIEW
   A scaled copy of the website hero, drawn at the real page
   width (1440 px desktop, 390 px phone) and shrunk to fit the
   panel, so line breaks match what visitors will see. Keep the
   measurements in HomeHeroPreview.css in step with the
   website's HomeHero.css.
========================================================= */

import { useRef } from "react";
import { thumbWindowStart } from "../../../utils/homeHeroForm";
import useFitScale from "../../../utils/useFitScale";

const DESIGN_WIDTH = { desktop: 1440, mobile: 390 };
const CAPABILITIES = ["Web", "Mobile Apps", "Software", "AI/ML", "IoT", "Product Engineering", "3D Design"];

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function Buttons({ slide }) {
  return (
    <div className="pa-hero-preview__actions">
      <span className="pa-hero-preview__btn pa-hero-preview__btn--primary">{slide.primary.label || "Main button"}<Arrow /></span>
      <span className="pa-hero-preview__btn pa-hero-preview__btn--ghost">{slide.secondary.label || "Second button"}</span>
    </div>
  );
}

export default function HomeHeroPreview({ slides, activeIndex, imageUrl, device, onSelect }) {
  const designWidth = DESIGN_WIDTH[device];
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const { scale, height } = useFitScale(designWidth, frameRef, stageRef);
  const total = slides.length;
  const active = slides[Math.min(activeIndex, total - 1)];
  if (!active) return <p className="pa-hero-editor__empty">Turn on at least one slide to see the preview.</p>;
  const start = thumbWindowStart(activeIndex, total);
  const thumbs = slides.slice(start, start + 3);
  const activeImage = imageUrl(active);

  return (
    <div className="pa-hero-preview__frame" ref={frameRef} style={{ height: height || undefined }}>
      <div
        ref={stageRef}
        className={`pa-hero-preview pa-hero-preview--${device}`}
        style={{ width: designWidth, transform: `scale(${scale})` }}
        aria-label={`${device === "desktop" ? "Desktop" : "Phone"} preview of slide ${activeIndex + 1}`}
      >
        {activeImage && <img className="pa-hero-preview__backdrop" src={activeImage} alt="" crossOrigin="use-credentials" />}
        <div className="pa-hero-preview__overlay" />
        <div className="pa-hero-preview__nav" aria-hidden="true">
          <span className="pa-hero-preview__logo">ProJenius</span>
          {device === "desktop"
            ? <span className="pa-hero-preview__menu">Home · About Us · Solutions · Startup &amp; Innovation · Learning · Products · News · Contact</span>
            : <span className="pa-hero-preview__burger" />}
        </div>

        <div className="pa-hero-preview__layout">
          <div className="pa-hero-preview__copy">
            <p className="pa-hero-preview__eyebrow">{active.eyebrow || "Eyebrow text"}</p>
            <h2 className="pa-hero-preview__title">
              {active.title || "Heading"}{" "}
              <span className="pa-hero-preview__highlight">{active.highlight || "Blue highlight"}</span>
            </h2>
            <p className="pa-hero-preview__description">{active.description || "Description of this slide."}</p>
            {device === "desktop" && <Buttons slide={active} />}
          </div>

          <div className="pa-hero-preview__showcase">
            <figure className="pa-hero-preview__feature">
              {activeImage ? <img src={activeImage} alt={active.alt} crossOrigin="use-credentials" /> : <span className="pa-hero-preview__no-image">Image</span>}
              <figcaption><span>{active.caption || "Caption"}</span></figcaption>
            </figure>
            <ol className="pa-hero-preview__thumbs">
              {thumbs.map((slide, offset) => {
                const index = start + offset;
                const url = imageUrl(slide);
                return (
                  <li key={slide.key}>
                    <button type="button" className={index === activeIndex ? "is-active" : ""} onClick={() => onSelect(index)} aria-label={`Preview slide ${index + 1}`}>
                      {url ? <img src={url} alt="" crossOrigin="use-credentials" /> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {device === "mobile" && <Buttons slide={active} />}

          <ul className="pa-hero-preview__capabilities" aria-hidden="true">
            {CAPABILITIES.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
