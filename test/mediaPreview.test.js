import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("course editor previews selected and saved covers through the authenticated image route", async () => {
  const component = await readFile(new URL("../src/Components/Admin/CourseManagement/CourseManagement.jsx", import.meta.url), "utf8");
  const service = await readFile(new URL("../src/services/courseManagementService.js", import.meta.url), "utf8");
  assert.match(component, /URL\.createObjectURL\(file\)/);
  assert.match(component, /URL\.revokeObjectURL\(selectedPreviewUrlRef\.current\)/);
  assert.match(component, /Selected image preview/);
  assert.match(component, /courseAdminImageUrl\(editing\)/);
  assert.match(component, /crossOrigin="use-credentials"/);
  assert.match(component, /savedCover\?\.filename/);
  assert.match(service, /\/api\/courses\/admin\/courses\/\$\{encodeURIComponent\(courseId\)\}\/image/);
});

test("News & Insights previews include credentials and show an image retrieval failure", async () => {
  const component = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.css", import.meta.url), "utf8");
  const routes = await readFile(new URL("../../projenius-backend/src/modules/publishing/publishing.routes.js", import.meta.url), "utf8");
  assert.match(component, /crossOrigin=\{localUrl \? undefined : "use-credentials"\}/);
  assert.match(component, /URL\.createObjectURL\(file\)/);
  assert.match(component, /localUrl=\{localImagePreviews\[image\.filename\]/);
  assert.match(component, /Image unavailable\. Check that the stored file exists/);
  assert.doesNotMatch(component, /currentTarget\.hidden = true/);
  assert.match(styles, /\.pa-publishing__media-grid img\{display:block;width:100%;height:260px;object-fit:contain;object-position:center/);
  assert.match(styles, /\.pa-publishing__preview img,\.pa-publishing__preview>img\{display:block;width:100%;max-width:100%;height:auto;max-height:560px;object-fit:contain;object-position:center/);
  assert.match(routes, /requireAnyPermission\("publishing:articles:view", "publishing:articles:edit"/);
});
