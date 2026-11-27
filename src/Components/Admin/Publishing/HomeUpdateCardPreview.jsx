/* =========================================================
   HIGHLIGHTS & UPDATES — HOME PAGE CARD PREVIEW
   Shows how this post appears in the home page section
   "What's Happening in …": as the open card, as a waiting
   card, and on a phone. Drawn at the website's real sizes
   (row 1189 × 480 px at 1440 px; phone card 350 × 420 px)
   and scaled to fit. Keep in step with the website's
   HighlightsAndUpdates.css.
========================================================= */

import { useRef } from "react";
import useFitScale from "../../../utils/useFitScale";

const ROW_WIDTH = 1189;
const PHONE_WIDTH = 350;

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function OpenCard({ post, number }) {
  return (
    <div className="pa-hcard pa-hcard--open">
      {post.imageUrl ? <img className="pa-hcard__bg" src={post.imageUrl} alt="" crossOrigin={post.imageCrossOrigin} /> : <div className="pa-hcard__bg pa-hcard__bg--empty">Cover image</div>}
      <div className="pa-hcard__overlay pa-hcard__overlay--open" />
      <div className="pa-hcard__open">
        <div className="pa-hcard__top">
          <span className="pa-hcard__category">{post.category || "Highlight"}</span>
          <span className="pa-hcard__num">{number}</span>
        </div>
        <div className="pa-hcard__body">
          <h3 className="pa-hcard__title">{post.title || "Your post title"}</h3>
          {post.summary && <p className="pa-hcard__summary">{post.summary}</p>}
          <span className="pa-hcard__cta">{post.ctaLabel || "Read Update"}<Arrow /></span>
        </div>
      </div>
    </div>
  );
}

function WaitingCard({ post, number, placeholder }) {
  return (
    <div className={`pa-hcard pa-hcard--waiting${placeholder ? " pa-hcard--placeholder" : ""}`}>
      {!placeholder && post.imageUrl && <img className="pa-hcard__bg" src={post.imageUrl} alt="" crossOrigin={post.imageCrossOrigin} />}
      <div className="pa-hcard__overlay" />
      <div className="pa-hcard__waiting">
        <span className="pa-hcard__icon" />
        <span className="pa-hcard__vertical">{placeholder ? "Another post" : post.title || "Your post title"}</span>
        <span className="pa-hcard__num pa-hcard__num--small">{number}</span>
      </div>
    </div>
  );
}

export default function HomeUpdateCardPreview({ post }) {
  const rowFrame = useRef(null);
  const rowStage = useRef(null);
  const phoneFrame = useRef(null);
  const phoneStage = useRef(null);
  const row = useFitScale(ROW_WIDTH, rowFrame, rowStage);
  const phone = useFitScale(PHONE_WIDTH, phoneFrame, phoneStage);
  const heading = post.category ? `in ${post.category}` : "at ProJenius";

  return (
    <section className="pa-hcard-preview" aria-label="Home page Highlights & Updates preview">
      <p className="pa-publishing__live-label">HOME PAGE · HIGHLIGHTS &amp; UPDATES</p>
      <p className="pa-hcard-preview__intro">The latest 10 published posts take turns as the large card, five seconds each.</p>

      <div className="pa-hcard-preview__frame" ref={rowFrame} style={{ height: row.height || undefined }}>
        <div className="pa-hcard-preview__stage" ref={rowStage} style={{ width: ROW_WIDTH, transform: `scale(${row.scale})` }}>
          <h4 className="pa-hcard-preview__heading">What’s Happening <span>{heading}|</span></h4>
          <div className="pa-hcard-preview__row">
            <OpenCard post={post} number="01" />
            <WaitingCard post={post} number="02" placeholder />
            <WaitingCard post={post} number="03" placeholder />
            <WaitingCard post={post} number="04" placeholder />
          </div>
        </div>
      </div>

      <div className="pa-hcard-preview__pair">
        <div>
          <p className="pa-hcard-preview__caption">While waiting its turn</p>
          <div className="pa-hcard-preview__waiting-frame">
            <WaitingCard post={post} number="01" />
          </div>
        </div>
        <div>
          <p className="pa-hcard-preview__caption">On a phone</p>
          <div className="pa-hcard-preview__frame pa-hcard-preview__frame--phone" ref={phoneFrame} style={{ height: phone.height || undefined }}>
            <div className="pa-hcard-preview__stage pa-hcard-preview__stage--phone" ref={phoneStage} style={{ width: PHONE_WIDTH, transform: `scale(${phone.scale})` }}>
              <OpenCard post={post} number="01" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
