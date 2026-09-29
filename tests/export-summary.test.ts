import { describe, expect, it } from "vitest";
import { findAnnotations } from "../src/annotation-syntax";
import { formatAnnotationsSummary } from "../src/export-summary";

describe("formatAnnotationsSummary", () => {
  it("formats annotations with Chinese color and place labels", () => {
    const source = [
      'Here is ==first annotation=={ann note="Check this out" place=top-right color=red}',
      'And ==second\nannotation=={ann note="Important detail" color=blue mark=off}',
      'Plain ==third=={ann note="默认"}',
    ].join("\n");

    expect(formatAnnotationsSummary(findAnnotations(source)).split("\n")).toEqual([
      "# Crisp 标注汇总（3）",
      "",
      "1. **first annotation**（红色 · 右上方）：Check this out",
      "2. **second annotation**（蓝色 · 下方 · 无高亮）：Important detail",
      "3. **third**（中性 · 下方）：默认",
    ]);
  });
});
