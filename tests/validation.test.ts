import { describe, expect, it } from "vitest";
import {
  normalizeAnnotationTarget,
  validateAnnotationTarget,
} from "../src/validation";

describe("normalizeAnnotationTarget", () => {
  it("trims leading and trailing whitespace and reports offsets", () => {
    const result = normalizeAnnotationTarget("  hello  ");
    expect(result.target).toBe("hello");
    expect(result.leadingTrim).toBe(2);
    expect(result.trailingTrim).toBe(2);
  });

  it("trims a trailing newline from line selections", () => {
    const result = normalizeAnnotationTarget("hello\n");
    expect(result.target).toBe("hello");
    expect(result.leadingTrim).toBe(0);
    expect(result.trailingTrim).toBe(1);
  });

  it("keeps internal whitespace untouched", () => {
    const result = normalizeAnnotationTarget("  hello world  ");
    expect(result.target).toBe("hello world");
    expect(result.leadingTrim).toBe(2);
    expect(result.trailingTrim).toBe(2);
  });

  it("returns an empty target for whitespace-only selections", () => {
    const result = normalizeAnnotationTarget("   \n  ");
    expect(result.target).toBe("");
    expect(result.leadingTrim).toBe(6);
    expect(result.trailingTrim).toBe(6);
  });
});

describe("validateAnnotationTarget", () => {
  it("still rejects untrimmed targets", () => {
    const result = validateAnnotationTarget(" hello ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("标注目标首尾不能有空白。");
  });

  it("still rejects == markers", () => {
    expect(validateAnnotationTarget("a==b").valid).toBe(false);
    expect(validateAnnotationTarget("a==b").error).toBe(
      "标注目标不能包含 == 高亮标记。",
    );
  });

  it("accepts multi-line targets", () => {
    expect(validateAnnotationTarget("line one\nline two").valid).toBe(true);
  });

  it("rejects targets whose written syntax could not be parsed back", () => {
    expect(validateAnnotationTarget("a =").valid).toBe(false);
    expect(validateAnnotationTarget("path\\").valid).toBe(false);
  });

  it("rejects targets spanning a paragraph break", () => {
    expect(validateAnnotationTarget("para one\n\npara two").valid).toBe(false);
    expect(validateAnnotationTarget("para one\n  \npara two").valid).toBe(false);
  });

  it("accepts trimmed single-line targets", () => {
    expect(validateAnnotationTarget("hello world").valid).toBe(true);
  });
});
