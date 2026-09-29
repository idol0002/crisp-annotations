export function validateAnnotationTarget(target: string): {
  valid: boolean;
  error?: string;
} {
  if (target !== target.trim()) {
    return {
      valid: false,
      error: "标注目标首尾不能有空白。",
    };
  }
  if (target.includes("==")) {
    return {
      valid: false,
      error: "标注目标不能包含 == 高亮标记。",
    };
  }
  // A trailing "=" merges into the closing "==", and a trailing "\" escapes it;
  // either way the written syntax could never be read back as an annotation.
  if (target.endsWith("=") || target.endsWith("\\")) {
    return {
      valid: false,
      error: "标注目标不能以 = 或 \\ 结尾，请调整选区。",
    };
  }
  // Highlights cannot span paragraphs, so Reading view would show raw syntax.
  if (/\n[ \t]*\r?\n/.test(target)) {
    return {
      valid: false,
      error: "标注目标不能跨越段落，请只选中同一段内的文字。",
    };
  }
  return { valid: true };
}

/**
 * 裁剪选区首尾空白并返回偏移量，供编辑器按裁剪后的精确范围替换，
 * 保留原文中选区之外的空白字符。
 */
export function normalizeAnnotationTarget(raw: string): {
  target: string;
  leadingTrim: number;
  trailingTrim: number;
} {
  return {
    target: raw.trim(),
    leadingTrim: raw.length - raw.trimStart().length,
    trailingTrim: raw.length - raw.trimEnd().length,
  };
}
