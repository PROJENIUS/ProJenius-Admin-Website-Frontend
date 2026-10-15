import assert from "node:assert/strict";
import test from "node:test";
import { adminApiUrl, normalizeAdminApiBase } from "../src/utils/apiUrl.js";

test("admin media API URLs use the configured origin without duplicate /api and reject production localhost", () => {
  const base = normalizeAdminApiBase("https://api.projenius.example/api/", false);
  assert.equal(base, "https://api.projenius.example");
  assert.equal(adminApiUrl("/api/admin/assets/image.jpg", base), "https://api.projenius.example/api/admin/assets/image.jpg");
  assert.equal(normalizeAdminApiBase("http://localhost:5000", false), "");
  assert.equal(normalizeAdminApiBase("", true), "http://localhost:5000");
});
