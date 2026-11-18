import { useEffect, useState } from "react";
import { cancelNewsletterCampaign, getNewsletterStats, listNewsletterCampaigns, listNewsletterDeliveries, listNewsletterSubscribers, removeNewsletterSubscriber, retryNewsletterCampaign, retryNewsletterWelcomeEmail } from "../../../services/publishingService";
import { hasPermission, isSuperAdmin } from "../../../utils/adminAccess";
import { formatSubscriptionDate, subscriberSerialNumber, subscriberStatusLabel } from "../../../utils/newsletterSubscriberView";
import "./PublishingManagement.css";

function welcomeEmailLabel(status) {
  return ({ sent: "Sent", queued: "Queued for retry", processing: "Sending", failed: "Failed", not_queued: "Not sent" })[status] || "Not recorded";
}

function welcomeEmailTone(status) {
  if (status === "sent") return "sent";
  if (status === "failed") return "failed";
  if (["queued", "processing"].includes(status)) return "pending";
  return "unknown";
}

export default function NewsletterManagement({ admin }) {
  const [stats, setStats] = useState({ active: 0, unsubscribed: 0 });
  const [subscribers, setSubscribers] = useState([]), [legacySubscribers, setLegacySubscribers] = useState([]), [campaigns, setCampaigns] = useState([]), [deliveries, setDeliveries] = useState([]);
  const [message, setMessage] = useState(""), [subscriberError, setSubscriberError] = useState(""), [subscriberLoading, setSubscriberLoading] = useState(true), [legacyLoading, setLegacyLoading] = useState(false);
  const [busy, setBusy] = useState(false), [removingId, setRemovingId] = useState("");
  const [retryingWelcomeId, setRetryingWelcomeId] = useState("");
  const [subscriberSearchInput, setSubscriberSearchInput] = useState(""), [subscriberSearch, setSubscriberSearch] = useState(""), [subscriberStatus, setSubscriberStatus] = useState(""), [subscriberPage, setSubscriberPage] = useState(1), [subscriberPages, setSubscriberPages] = useState(1), [subscriberTotal, setSubscriberTotal] = useState(0), [legacyPages, setLegacyPages] = useState(1), [legacyPage, setLegacyPage] = useState(1), [showLegacy, setShowLegacy] = useState(false), [refreshKey, setRefreshKey] = useState(0);
  const [deliveryCampaign, setDeliveryCampaign] = useState(null);
  const canSubscribers = hasPermission(admin, "newsletter:subscribers:view"), canRetryWelcome = hasPermission(admin, "newsletter:subscribers:retry"), canCampaigns = hasPermission(admin, "newsletter:campaigns:view"), canRetry = hasPermission(admin, "newsletter:campaigns:retry"), canCancel = hasPermission(admin, "newsletter:campaigns:cancel"), canRemove = isSuperAdmin(admin);

  useEffect(() => {
    let active = true;
    const subscriberRequest = canSubscribers ? Promise.all([
      getNewsletterStats(),
      listNewsletterSubscribers({ page: subscriberPage, limit: 20, search: subscriberSearch, ...(subscriberStatus ? { status: subscriberStatus } : {}) }),
      showLegacy ? listNewsletterSubscribers({ page: legacyPage, limit: 20, search: subscriberSearch, legacyPending: true }) : Promise.resolve(null),
    ]) : Promise.resolve(null);
    const campaignRequest = canCampaigns ? listNewsletterCampaigns({ page: 1, limit: 5 }) : Promise.resolve(null);
    Promise.allSettled([subscriberRequest, campaignRequest]).then((requests) => {
      if (!active) return;
      const subscriberResult = requests[0];
      if (subscriberResult.status === "fulfilled" && subscriberResult.value) {
        const [statsResult, listResult, legacyResult] = subscriberResult.value;
        setStats({ active: statsResult.counts?.active || 0, unsubscribed: statsResult.counts?.unsubscribed || 0, legacyPending: statsResult.legacyPending || 0 }); setSubscriberTotal(listResult.pagination?.total || 0); setSubscribers(listResult.items || []); setSubscriberPages(listResult.pagination?.pages || 1);
        if (legacyResult) { setLegacySubscribers(legacyResult.items || []); setLegacyPages(legacyResult.pagination?.pages || 1); }
      } else if (subscriberResult.status === "rejected") setSubscriberError(subscriberResult.reason?.message || "Subscriber records could not be loaded.");
      setSubscriberLoading(false);
      if (showLegacy) setLegacyLoading(false);
      const campaignResult = requests[1];
      if (campaignResult.status === "fulfilled" && campaignResult.value) setCampaigns((campaignResult.value.items || []).slice(0, 5));
      else if (campaignResult.status === "rejected") setMessage(campaignResult.reason.message);
    });
    return () => { active = false; };
  }, [canSubscribers, canCampaigns, subscriberPage, subscriberSearch, subscriberStatus, showLegacy, legacyPage, refreshKey]);

  function openLegacyReview() { setShowLegacy((value) => { setLegacyLoading(!value); return !value; }); setLegacyPage(1); }
  async function removeSubscriber(subscriber) {
    const prompt = `Remove this subscriber?\n\nThis email address will be suppressed from future ProJenius newsletter campaigns. Existing campaign history will be preserved.\n\n${subscriber.email}`;
    if (!canRemove || removingId || !window.confirm(prompt)) return;
    setRemovingId(subscriber._id); setMessage(""); setSubscriberLoading(true); setSubscriberError("");
    try { await removeNewsletterSubscriber(subscriber._id); setMessage(`${subscriber.email} was removed from future newsletter campaigns.`); setRefreshKey((value) => value + 1); }
    catch (error) { setMessage(error.message || "The subscriber could not be removed."); }
    finally { setRemovingId(""); }
  }
  async function retryWelcomeEmail(subscriber) {
    if (retryingWelcomeId) return;
    setRetryingWelcomeId(subscriber._id); setMessage(""); setSubscriberError("");
    try {
      const result = await retryNewsletterWelcomeEmail(subscriber._id);
      setSubscribers((current) => current.map((item) => item._id === subscriber._id ? { ...item, ...result.item } : item));
      setMessage(result.message || "Welcome email retry completed.");
    } catch (error) {
      setSubscriberError(error.message || "Welcome email could not be retried. Check the mail configuration and try again.");
      setRefreshKey((value) => value + 1);
    } finally { setRetryingWelcomeId(""); }
  }
  async function act(action, id) { if (action === "cancel" && !window.confirm("Cancel remaining deliveries for this queued campaign?")) return; setBusy(true); try { if (action === "retry") await retryNewsletterCampaign(id); else await cancelNewsletterCampaign(id); setMessage("Campaign updated."); const response = await listNewsletterCampaigns({ page: 1, limit: 5 }); setCampaigns((response.items || []).slice(0, 5)); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  async function showDeliveries(campaign) { setDeliveryCampaign(campaign); setBusy(true); try { const result = await listNewsletterDeliveries(campaign._id); setDeliveries(result.items || []); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }

  return <section className="pa-publishing pa-newsletter">
    <header><h2>Newsletter</h2><p>Manage active subscribers and review announcement campaign delivery history.</p></header>
    {message && <p role="status" className="pa-newsletter__notice">{message}</p>}
    {canSubscribers && <section className="pa-newsletter__subscriber-section" aria-labelledby="newsletter-subscribers-title">
      <div className="pa-newsletter__heading"><div><h3 id="newsletter-subscribers-title">Subscribers</h3><p>{subscriberTotal} matching records · Active {stats.active || 0} · Unsubscribed {stats.unsubscribed || 0}</p></div></div>
      {stats.legacyPending > 0 && <aside className="pa-newsletter__legacy-note"><span>{stats.legacyPending} legacy pending record{stats.legacyPending === 1 ? "" : "s"} need consent review. They are not active and are excluded from campaigns.</span><button type="button" onClick={openLegacyReview}>{showLegacy ? "Hide review list" : "Review legacy records"}</button></aside>}
      <form className="pa-newsletter__filters" onSubmit={(event) => { event.preventDefault(); setSubscriberLoading(true); setSubscriberError(""); setSubscriberPage(1); setSubscriberSearch(subscriberSearchInput.trim()); setRefreshKey((value) => value + 1); }}>
        <label>Search email<input type="search" maxLength="100" value={subscriberSearchInput} onChange={(event) => setSubscriberSearchInput(event.target.value)} placeholder="Search by email" /></label>
        <label>Status<select value={subscriberStatus} onChange={(event) => { setSubscriberLoading(true); setSubscriberError(""); setSubscriberPage(1); setSubscriberStatus(event.target.value); }}><option value="">All statuses</option><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option></select></label>
        <button type="submit">Search</button>
      </form>
      {subscriberError && <p role="alert" className="pa-newsletter__error">{subscriberError}</p>}
      {subscriberLoading ? <p role="status">Loading subscribers…</p> : subscribers.length ? <div className="pa-newsletter__table-wrap"><table className="pa-newsletter__table"><thead><tr><th scope="col">S.No.</th><th scope="col">Email Address</th><th scope="col">Subscription Date &amp; Time</th><th scope="col">Welcome email</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{subscribers.map((subscriber, index) => <tr key={subscriber._id}><td data-label="S.No.">{subscriberSerialNumber(subscriberPage, index, 20)}</td><td data-label="Email Address" className="pa-newsletter__email">{subscriber.email}</td><td data-label="Subscription Date &amp; Time">{formatSubscriptionDate(subscriber.subscribedAt)}</td><td data-label="Welcome email"><span className={`pa-newsletter__badge pa-newsletter__badge--email-${welcomeEmailTone(subscriber.welcomeEmailStatus)}`} title={subscriber.welcomeEmailSentAt ? `Sent ${formatSubscriptionDate(subscriber.welcomeEmailSentAt)}` : `${subscriber.welcomeEmailAttempts || 0} attempts`}>{welcomeEmailLabel(subscriber.welcomeEmailStatus)}</span></td><td data-label="Status"><span className={`pa-newsletter__badge pa-newsletter__badge--${subscriber.status === "active" ? "active" : subscriber.status === "unsubscribed" ? "unsubscribed" : "unknown"}`}>{subscriberStatusLabel(subscriber.status)}</span></td><td data-label="Action" className="pa-newsletter__action"><div className="pa-newsletter__subscriber-actions">{canRetryWelcome && subscriber.status === "active" && subscriber.welcomeEmailStatus === "failed" && <button type="button" className="pa-newsletter__retry-email" disabled={Boolean(retryingWelcomeId)} onClick={() => void retryWelcomeEmail(subscriber)}>{retryingWelcomeId === subscriber._id ? "Retrying…" : "Retry email"}</button>}{canRemove && subscriber.status !== "unsubscribed" ? <button type="button" className="pa-newsletter__remove" disabled={Boolean(removingId)} onClick={() => removeSubscriber(subscriber)}>{removingId === subscriber._id ? "Removing…" : "Remove"}</button> : !(canRetryWelcome && subscriber.status === "active" && subscriber.welcomeEmailStatus === "failed") && <span aria-label={canRemove ? "Already unsubscribed" : "No action available"}>—</span>}</div></td></tr>)}</tbody></table></div> : <p className="pa-newsletter__empty">No subscribers match these filters.</p>}
      {!subscriberLoading && subscriberPages > 1 && <nav className="pa-publishing__pagination" aria-label="Subscriber pages"><button type="button" disabled={subscriberPage <= 1} onClick={() => { setSubscriberLoading(true); setSubscriberError(""); setSubscriberPage((page) => page - 1); }}>Previous</button><span>Page {subscriberPage} of {subscriberPages}</span><button type="button" disabled={subscriberPage >= subscriberPages} onClick={() => { setSubscriberLoading(true); setSubscriberError(""); setSubscriberPage((page) => page + 1); }}>Next</button></nav>}
      {showLegacy && <section className="pa-newsletter__legacy" aria-labelledby="newsletter-legacy-title"><h4 id="newsletter-legacy-title">Legacy records — review only</h4><p>These records came from the previous confirmation workflow. They remain inactive until a visitor provides fresh consent.</p>{legacyLoading ? <p role="status">Loading legacy records…</p> : legacySubscribers.length ? <div className="pa-newsletter__table-wrap"><table className="pa-newsletter__table"><thead><tr><th scope="col">S.No.</th><th scope="col">Email Address</th><th scope="col">Subscription Date &amp; Time</th><th scope="col">Review Status</th><th scope="col">Action</th></tr></thead><tbody>{legacySubscribers.map((subscriber, index) => <tr key={subscriber._id}><td>{subscriberSerialNumber(legacyPage, index, 20)}</td><td className="pa-newsletter__email">{subscriber.email}</td><td>{formatSubscriptionDate(subscriber.subscribedAt)}</td><td><span className="pa-newsletter__badge pa-newsletter__badge--unknown">Legacy pending · review only</span></td><td>{canRemove && <button type="button" className="pa-newsletter__remove" disabled={Boolean(removingId)} onClick={() => removeSubscriber(subscriber)}>{removingId === subscriber._id ? "Removing…" : "Suppress"}</button>}</td></tr>)}</tbody></table></div> : <p>No legacy records need review.</p>}{legacyPages > 1 && <nav className="pa-publishing__pagination" aria-label="Legacy subscriber review pages"><button type="button" disabled={legacyPage <= 1} onClick={() => setLegacyPage((page) => page - 1)}>Previous</button><span>Page {legacyPage} of {legacyPages}</span><button type="button" disabled={legacyPage >= legacyPages} onClick={() => setLegacyPage((page) => page + 1)}>Next</button></nav>}</section>}
    </section>}
    {canCampaigns && <section className="pa-newsletter__campaigns" aria-labelledby="newsletter-campaign-title"><div className="pa-newsletter__campaign-heading"><div><h3 id="newsletter-campaign-title">Campaign history</h3><p>Showing the 5 most recent announcement campaigns.</p></div></div>{campaigns.length ? <div className="pa-newsletter__campaign-table-wrap"><table className="pa-newsletter__campaign-table"><thead><tr><th scope="col">Campaign</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Recipients</th><th scope="col">Sent</th><th scope="col">Failed</th><th scope="col">Suppressed</th><th scope="col">Actions</th></tr></thead><tbody>{campaigns.slice(0, 5).map((campaign) => <tr key={campaign._id}><th scope="row" className="pa-newsletter__campaign-name">{campaign.titleSnapshot}</th><td>{campaign.type}</td><td><span className={`pa-newsletter__campaign-status pa-newsletter__campaign-status--${campaign.status}`}>{campaign.status}</span></td><td>{campaign.eligibleCount ?? 0}</td><td>{campaign.sentCount ?? 0}</td><td><span className={campaign.failedCount > 0 ? "pa-newsletter__campaign-failed" : ""}>{campaign.failedCount ?? 0}</span></td><td>{campaign.suppressedCount ?? 0}</td><td><div className="pa-newsletter__campaign-actions"><button type="button" onClick={() => showDeliveries(campaign)}>Deliveries</button>{canRetry && campaign.failedCount > 0 && <button type="button" disabled={busy} onClick={() => act("retry", campaign._id)}>Retry failed</button>}{canCancel && campaign.status === "queued" && <button type="button" disabled={busy} onClick={() => act("cancel", campaign._id)}>Cancel</button>}</div></td></tr>)}</tbody></table></div> : <p className="pa-newsletter__empty">No campaigns yet. Publishing a course or News &amp; Insights article will appear here.</p>}</section>}
    {deliveryCampaign && <section aria-labelledby="newsletter-delivery-title"><h3 id="newsletter-delivery-title">Delivery details: {deliveryCampaign.titleSnapshot}</h3><button type="button" onClick={() => setDeliveryCampaign(null)}>Close details</button>{deliveries.length ? deliveries.map((delivery) => <p key={delivery._id}>{delivery.subscriberId?.email || "Subscriber"} · {delivery.status}{delivery.failureCode ? ` · ${delivery.failureCode}` : ""}{delivery.lastError ? ` · ${delivery.lastError}` : ""}</p>) : <p>No delivery records in this page.</p>}</section>}
  </section>;
}
