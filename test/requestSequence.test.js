import assert from "node:assert/strict";
import test from "node:test";
import { createRequestSequence } from "../src/utils/requestSequence.js";

test("only the latest list request may update the displayed results", () => {
  const sequence = createRequestSequence();
  const previousRequest = sequence.begin();
  const filteredRequest = sequence.begin();

  assert.equal(sequence.isLatest(filteredRequest), true);
  assert.equal(sequence.isLatest(previousRequest), false);
});

test("requests are invalidated when the list component is disposed", () => {
  const sequence = createRequestSequence();
  const request = sequence.begin();
  sequence.invalidate();

  assert.equal(sequence.isLatest(request), false);
});
