import type { AnnotationMatch } from "./annotation-syntax";
import { COLOR_LABELS, PLACE_LABELS } from "./constants";

export function formatAnnotationsSummary(matches: AnnotationMatch[]): string {
  return [
    `# Crisp 标注汇总（${matches.length}）`,
    "",
    ...matches.map(({ target, spec }, index) => {
      const details = [COLOR_LABELS[spec.color], PLACE_LABELS[spec.place]];
      if (!spec.mark) {
        details.push("无高亮");
      }
      return `${index + 1}. **${target.replace(/\s*\n\s*/g, " ")}**（${details.join(" · ")}）：${spec.note}`;
    }),
  ].join("\n");
}
