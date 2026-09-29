import { findAnnotations } from "./annotation-syntax";

let annotationSequence = 0;

function nextAnnotationLabelId(ownerDocument: Document): string {
  annotationSequence += 1;
  let id = `crisp-ann-note-${annotationSequence}`;
  while (ownerDocument.getElementById(id)) {
    annotationSequence += 1;
    id = `crisp-ann-note-${annotationSequence}`;
  }
  return id;
}

function blockSpacingClass(place: string): string | null {
  if (place.startsWith("top")) {
    return "crisp-ann-block--space-top";
  }
  if (place.startsWith("bottom")) {
    return "crisp-ann-block--space-bottom";
  }
  return null;
}

interface AnnotationMaskState {
  masked: boolean;
  revealed: boolean;
}

function isRecallModeEnabled(label: HTMLElement): boolean {
  return label.ownerDocument.body.getAttribute("data-crisp-ann-recall") === "true";
}

function captureMaskState(label: HTMLElement): AnnotationMaskState {
  return {
    masked: label.classList.contains("is-masked"),
    revealed: label.classList.contains("is-revealed"),
  };
}

function isLabelVisible(label: HTMLElement): boolean {
  return isRecallModeEnabled(label)
    ? label.classList.contains("is-revealed")
    : !label.classList.contains("is-masked");
}

function syncMaskAccessibility(label: HTMLElement): void {
  label.setAttribute("aria-pressed", String(isLabelVisible(label)));
}

function restoreMaskState(label: HTMLElement, state: AnnotationMaskState): void {
  label.classList.toggle("is-masked", state.masked);
  label.classList.toggle("is-revealed", state.revealed);
  syncMaskAccessibility(label);
}

function toggleMaskState(label: HTMLElement): void {
  if (isRecallModeEnabled(label)) {
    label.classList.remove("is-masked");
    label.classList.toggle("is-revealed");
  } else {
    label.classList.remove("is-revealed");
    label.classList.toggle("is-masked");
  }
  syncMaskAccessibility(label);
}

export function resetAnnotationMaskState(
  ownerDocument: Document,
  recallMode: boolean,
): void {
  for (const label of ownerDocument.querySelectorAll<HTMLElement>(
    ".crisp-ann__label.is-revealed, .crisp-ann__label.is-masked",
  )) {
    label.classList.remove("is-revealed", "is-masked");
  }
  for (const label of ownerDocument.querySelectorAll<HTMLElement>(
    '.crisp-ann__label[aria-pressed]',
  )) {
    label.setAttribute("aria-pressed", String(!recallMode));
  }
}

export type ReadingAnnotationEditHandler = (
  wrapper: HTMLElement,
  annotation: RenderedDirective,
  renderedIndex: number,
) => void;

export interface RenderedDirective {
  length: number;
  spec: ReturnType<typeof findAnnotations>[number]["spec"];
}

// Markdown rendering drops backslash escapes and turns markup inside the note
// (**bold**, `code`, links, tags) into elements, so the directive can arrive as
// several nodes whose text no longer matches the stored syntax exactly.
const RENDERED_DIRECTIVE_PATTERN = /^\{ann\s+note="([\s\S]*?)"((?:\s+(?:place|color|mark)=[a-z-]+)*)\s*\}/;
const RENDERED_DIRECTIVE_MAX_NODES = 24;
const RENDERED_DIRECTIVE_MAX_LENGTH = 4000;

function parseDirective(text: string): RenderedDirective | null {
  const annotation = findAnnotations(`==x==${text}`)[0];
  if (annotation && annotation.from === 0 && annotation.target === "x") {
    return {
      length: annotation.directiveTo - annotation.directiveFrom,
      spec: annotation.spec,
    };
  }
  const rendered = RENDERED_DIRECTIVE_PATTERN.exec(text);
  if (!rendered || rendered[1].trim().length === 0) {
    return null;
  }
  const escapedNote = rendered[1].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const probe = findAnnotations(`==x=={ann note="${escapedNote}"${rendered[2]}}`)[0];
  if (!probe) {
    return null;
  }
  return {
    length: rendered[0].length,
    spec: { ...probe.spec, note: rendered[1] },
  };
}

// Returns the sibling nodes holding the directive and how many characters of
// the last one belong to it, or null when the directive cannot be isolated.
function collectDirective(first: Node): {
  directive: RenderedDirective;
  nodes: Node[];
  tailLength: number;
} | null {
  const nodes: Node[] = [];
  let text = "";
  for (
    let node: Node | null = first;
    node && nodes.length < RENDERED_DIRECTIVE_MAX_NODES;
    node = node.nextSibling
  ) {
    nodes.push(node);
    text += node.textContent ?? "";
    if (text.length > RENDERED_DIRECTIVE_MAX_LENGTH) {
      return null;
    }
    const directive = parseDirective(text);
    if (!directive) {
      continue;
    }
    const lastNode = nodes[nodes.length - 1];
    const tailLength = directive.length
      - (text.length - (lastNode.textContent ?? "").length);
    // A directive ending inside an element (not a text node) cannot be split cleanly.
    if (tailLength < (lastNode.textContent ?? "").length && lastNode.nodeType !== 3) {
      return null;
    }
    return { directive, nodes, tailLength };
  }
  return null;
}

export function renderAnnotationsInElement(
  root: HTMLElement,
  onEdit?: ReadingAnnotationEditHandler,
): number {
  let rendered = 0;
  const marks = Array.from(root.querySelectorAll<HTMLElement>("mark"));
  for (const mark of marks) {
    if (mark.classList.contains("crisp-ann__target")) {
      continue;
    }
    const directiveNode = mark.nextSibling;
    if (
      !directiveNode
      || directiveNode.nodeType !== 3
      || !(directiveNode.textContent ?? "").startsWith("{ann")
    ) {
      continue;
    }
    const collected = collectDirective(directiveNode);
    if (!collected) {
      continue;
    }
    const annotation = collected.directive;

    const renderedIndex = rendered;
    const ownerDocument = mark.ownerDocument;
    const wrapper = ownerDocument.createElement("span");
    wrapper.classList.add(
      "crisp-ann",
      `crisp-ann--${annotation.spec.place}`,
      `crisp-ann--${annotation.spec.color}`,
    );
    if (!annotation.spec.mark) {
      wrapper.classList.add("crisp-ann--no-mark");
    }

    const label = ownerDocument.createElement("span");
    label.className = "crisp-ann__label";
    label.id = nextAnnotationLabelId(ownerDocument);
    label.setAttribute("role", "note");
    label.textContent = annotation.spec.note;
    if (onEdit) {
      label.classList.add("crisp-ann__label--editable");
      label.setAttribute("role", "button");
      label.setAttribute("aria-keyshortcuts", "Enter Space Shift+Enter");
      label.tabIndex = 0;
      label.title = "单击或按 Enter 遮罩/揭晓 · 双击或按 Shift+Enter 编辑标注";
      syncMaskAccessibility(label);
      let pointerStartState: AnnotationMaskState | null = null;
      label.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.detail > 1) {
          return;
        }
        pointerStartState = captureMaskState(label);
        toggleMaskState(label);
      });
      label.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (pointerStartState) {
          restoreMaskState(label, pointerStartState);
          pointerStartState = null;
        }
        onEdit(wrapper, annotation, renderedIndex);
      });
      label.addEventListener("keydown", (event) => {
        if (event.shiftKey && event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          onEdit(wrapper, annotation, renderedIndex);
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        toggleMaskState(label);
      });
    }

    const block = mark.closest<HTMLElement>("p, li, td, th, blockquote");
    block?.classList.add("crisp-ann-block");
    const spacingClass = blockSpacingClass(annotation.spec.place);
    if (spacingClass) {
      block?.classList.add(spacingClass);
    }

    mark.parentNode?.insertBefore(wrapper, mark);
    wrapper.append(mark, label);
    mark.classList.add("crisp-ann__target");
    mark.setAttribute("aria-describedby", label.id);

    const lastNode = collected.nodes[collected.nodes.length - 1];
    for (const node of collected.nodes.slice(0, -1)) {
      node.parentNode?.removeChild(node);
    }
    if (lastNode.nodeType === 3) {
      const textNode = lastNode as Text;
      textNode.data = textNode.data.slice(collected.tailLength);
      if (textNode.data.length === 0) {
        textNode.remove();
      }
    } else {
      lastNode.parentNode?.removeChild(lastNode);
    }
    rendered += 1;
  }
  return rendered;
}
