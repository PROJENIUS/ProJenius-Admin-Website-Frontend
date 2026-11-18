import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasPermission } from "../src/utils/adminAccess.js";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("legal editors use the existing permission-gated admin workspace", async () => {
  const [sidebar, workspace, editor] = await Promise.all([
    readSource("../src/Components/Admin/AdminSidebar/AdminSidebar.jsx"),
    readSource("../src/Components/Admin/AdminWorkspace/AdminWorkspace.jsx"),
    readSource("../src/Components/Admin/LegalManagement/LegalManagement.jsx"),
  ]);

  assert.match(sidebar, /title: "LEGAL PAGES"/);
  for (const key of ["terms", "privacy-policy", "course-terms"]) {
    assert.ok(sidebar.includes(`/legal/${key}`));
  }
  assert.match(sidebar, /permission: "legal:documents:view"/);
  assert.match(
    workspace,
    /path\.startsWith\("\/legal\/"\).*hasPermission\(admin, "legal:documents:view"\)/s,
  );
  assert.match(workspace, /canEdit=\{hasPermission\(admin, "legal:documents:edit"\)\}/);
  assert.match(editor, /beforeunload/);
  assert.match(editor, /window\.confirm\([\s\S]*?Remove this section/);
  assert.match(editor, /Save and publish/);
  assert.match(editor, /Reload saved version/);
  assert.match(editor, /aria-label="Unsaved legal document preview"/);

  assert.equal(
    hasPermission({ role: "admin", permissions: [] }, "legal:documents:view"),
    false,
  );
  assert.equal(
    hasPermission(
      { role: "admin", permissions: ["legal:documents:view"] },
      "legal:documents:view",
    ),
    true,
  );
});

test("legal admin client uses the authenticated API and CSRF for updates", async () => {
  const service = await readSource("../src/services/legalManagementService.js");

  assert.match(service, /\/api\/legal\/admin\//);
  assert.match(service, /credentials: "include"/);
  assert.match(service, /getAdminCsrfToken\(\)/);
  assert.match(service, /method,\s*credentials/);
  assert.match(service, /method: "PUT"/);
});
