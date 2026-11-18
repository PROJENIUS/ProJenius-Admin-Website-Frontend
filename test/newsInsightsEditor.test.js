import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("News & Insights editor previews the same article fields and public URL being authored", async () => {
  const editor = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.css", import.meta.url), "utf8");
  assert.match(editor, /function ArticleBodyPreview/);
  assert.match(editor, /value=\{form\.contentType\}/);
  assert.match(editor, /LIVE PREVIEW/);
  assert.match(editor, /Public link: \/news-insights/);
  assert.match(editor, /queues an announcement for active subscribers who gave email consent/);
  assert.match(styles, /\.pa-publishing__editor-layout/);
  assert.match(styles, /@media\(max-width:1050px\)/);
});

test("subscriber list distinguishes welcome email delivery outcomes", async () => {
  const management = await readFile(new URL("../src/Components/Admin/Publishing/NewsletterManagement.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.css", import.meta.url), "utf8");
  assert.match(management, /Welcome email/);
  assert.match(management, /welcomeEmailStatus/);
  assert.match(management, /welcomeEmailLabel/);
  assert.match(styles, /pa-newsletter__badge--email-failed/);
  assert.match(styles, /pa-newsletter__badge--email-sent/);
});

test("campaign history is a table limited to the newest five records", async () => {
  const management = await readFile(new URL("../src/Components/Admin/Publishing/NewsletterManagement.jsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/publishingService.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.css", import.meta.url), "utf8");
  assert.match(management, /listNewsletterCampaigns\(\{ page: 1, limit: 5 \}\)/);
  assert.match(management, /campaigns\.slice\(0, 5\)\.map/);
  assert.match(management, /pa-newsletter__campaign-table/);
  assert.match(management, /<th scope="col">Failed<\/th>/);
  assert.match(styles, /\.pa-newsletter__campaign-table-wrap/);
  assert.match(service, /limit: 20, \.\.\.filters/);
});
