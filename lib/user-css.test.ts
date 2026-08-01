import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeUserStyle } from "./user-css.ts";

describe("sanitizeUserStyle border limits", () => {
  it("rejects oversized border shorthand widths", () => {
    assert.equal(sanitizeUserStyle("border: 999999999px solid red"), "");
    assert.equal(sanitizeUserStyle("border-top: 100px solid #f00"), "");
  });

  it("allows reasonable border shorthand widths", () => {
    assert.equal(
      sanitizeUserStyle("border: 2px solid red"),
      "border: 2px solid red"
    );
    assert.equal(
      sanitizeUserStyle("border-left: 32px dashed blue"),
      "border-left: 32px dashed blue"
    );
  });

  it("rejects oversized border-width declarations", () => {
    assert.equal(sanitizeUserStyle("border-width: 8192px"), "");
    assert.equal(sanitizeUserStyle("border-top-width: 33px"), "");
  });

  it("allows border-width up to 32px", () => {
    assert.equal(sanitizeUserStyle("border-width: 32px"), "border-width: 32px");
    assert.equal(
      sanitizeUserStyle("border-bottom-width: 1px"),
      "border-bottom-width: 1px"
    );
  });
});
