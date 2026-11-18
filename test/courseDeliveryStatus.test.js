import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("course delivery status columns receive distinct failed, pending and success styles", async () => {
  const component = await readFile(new URL("../src/Components/Admin/CourseManagement/CourseManagement.jsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/Components/Admin/CourseManagement/CourseManagement.css", import.meta.url), "utf8");
  assert.match(component, /customerEmailStatus/);
  assert.match(component, /receiptStatus/);
  assert.match(component, /pa-course__delivery-status is-\$\{tone\}/);
  assert.match(component, /return "failed"/);
  assert.match(component, /return "success"/);
  assert.match(component, /return "pending"/);
  assert.match(styles, /\.pa-course__delivery-status\.is-failed/);
  assert.match(styles, /\.pa-course__delivery-status\.is-success/);
  assert.match(styles, /\.pa-course__delivery-status\.is-pending/);
});
