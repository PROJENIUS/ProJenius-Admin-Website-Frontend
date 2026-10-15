import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatSubscriptionDate, subscriberSerialNumber, subscriberStatusLabel } from "../src/utils/newsletterSubscriberView.js";

test("subscriber table helpers preserve page numbering and the actual subscription timestamp", () => {
  assert.equal(subscriberSerialNumber(1, 0, 20), 1);
  assert.equal(subscriberSerialNumber(3, 4, 20), 45);
  assert.equal(formatSubscriptionDate("2026-02-03T04:05:00.000Z"), "3 Feb 2026, 9:35 am");
  assert.equal(formatSubscriptionDate(null), "—");
  assert.equal(formatSubscriptionDate("not-a-date"), "—");
});

test("normal subscriber statuses are Active and Unsubscribed while legacy pending is review-only", () => {
  assert.equal(subscriberStatusLabel("active"), "Active");
  assert.equal(subscriberStatusLabel("unsubscribed"), "Unsubscribed");
  assert.equal(subscriberStatusLabel("pending", true), "Legacy pending · review only");
  assert.equal(subscriberStatusLabel("pending"), "Unrecognized status");
});

test("subscriber management renders a paginated table, server filters and Super Admin-only suppression", async () => {
  const source = await readFile(new URL("../src/Components/Admin/Publishing/NewsletterManagement.jsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/publishingService.js", import.meta.url), "utf8");
  assert.match(source, /<th scope="col">S\.No\.<\/th>/);
  assert.match(source, /Email Address/);
  assert.match(source, /Subscription Date &amp; Time/);
  assert.match(source, /<option value="active">Active<\/option><option value="unsubscribed">Unsubscribed<\/option>/);
  assert.doesNotMatch(source, /<option[^>]*value="pending"/);
  assert.match(source, /legacyPending: true/);
  assert.match(source, /canRemove = isSuperAdmin\(admin\)/);
  assert.match(source, /window\.confirm\(prompt\)/);
  assert.match(service, /method: "DELETE", csrf: true/);
});
