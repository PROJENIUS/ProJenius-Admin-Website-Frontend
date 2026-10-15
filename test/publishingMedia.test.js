import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parsePublishingVideo } from "../src/utils/publishingMedia.js";

test("publishing video URL parser canonicalizes supported providers and rejects unsafe URLs", () => {
  assert.deepEqual(parsePublishingVideo("https://youtu.be/AbCdEf12345", "  Product demo  "), {
    provider: "youtube", videoId: "AbCdEf12345", url: "https://www.youtube.com/watch?v=AbCdEf12345", title: "Product demo",
  });
  assert.equal(parsePublishingVideo("https://player.vimeo.com/video/1234567").provider, "vimeo");
  for (const url of ["http://youtu.be/AbCdEf12345", "https://youtube.com.attacker.invalid/watch?v=AbCdEf12345", "javascript:alert(1)", "https://vimeo.com.evil.invalid/1234"]) assert.throws(() => parsePublishingVideo(url));
});

test("unified publishing editor exposes separate removable galleries and keeps the five-image client limit", async () => {
  const source = await readFile(new URL("../src/Components/Admin/Publishing/PublishingManagement.jsx", import.meta.url), "utf8");
  assert.match(source, /Images · up to five/);
  assert.match(source, /multiple disabled=\{busy \|\| form\.images\.length >= 5\}/);
  assert.match(source, /Remove from article/);
  assert.match(source, /Videos · YouTube or Vimeo/);
  assert.match(source, /Remove<\/button>/);
  assert.match(source, /Status<select/);
});
