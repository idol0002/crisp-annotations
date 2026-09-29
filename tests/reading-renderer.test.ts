import { beforeEach, describe, expect, it } from "vitest";
import { renderAnnotationsInElement } from "../src/reading-renderer";

describe("renderAnnotationsInElement", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.body.removeAttribute("data-crisp-ann-recall");
  });

  it("turns an annotated mark into an accessible hand-note wrapper", () => {
    document.body.innerHTML = [
      '<p id="paragraph">',
      "<mark>迁移指南</mark>",
      '{ann note="发布前先复核" place=top-right color=red mark=off} 后文',
      "</p>",
    ].join("");

    expect(renderAnnotationsInElement(document.body)).toBe(1);

    const wrapper = document.querySelector<HTMLElement>(".crisp-ann");
    const target = document.querySelector<HTMLElement>(".crisp-ann__target");
    const label = document.querySelector<HTMLElement>(".crisp-ann__label");
    expect(wrapper?.classList.contains("crisp-ann--top-right")).toBe(true);
    expect(wrapper?.classList.contains("crisp-ann--red")).toBe(true);
    expect(wrapper?.classList.contains("crisp-ann--no-mark")).toBe(true);
    expect(target?.textContent).toBe("迁移指南");
    expect(target?.getAttribute("aria-describedby")).toBe(label?.id);
    expect(label?.getAttribute("role")).toBe("note");
    expect(label?.textContent).toBe("发布前先复核");
    expect(document.querySelector("#paragraph")?.classList.contains(
      "crisp-ann-block--space-top",
    )).toBe(true);
    expect(document.querySelector("#paragraph")?.textContent).toBe(
      "迁移指南发布前先复核 后文",
    );
  });

  it("does not add hover flashing classes on mouse hover", () => {
    document.body.innerHTML = [
      "<p><mark>hover target</mark>{ann note=\"test note\"}</p>",
    ].join("");

    renderAnnotationsInElement(document.body);

    const target = document.querySelector<HTMLElement>(".crisp-ann__target");
    const label = document.querySelector<HTMLElement>(".crisp-ann__label");

    expect(target).not.toBeNull();
    expect(label).not.toBeNull();

    target?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(label?.classList.contains("crisp-ann--hovered")).toBe(false);
  });

  it("assigns a unique accessible label id to every rendered annotation", () => {
    document.body.innerHTML = [
      '<p><mark>第一个</mark>{ann note="注释一" place=left}</p>',
      '<p><mark>第二个</mark>{ann note="注释二" place=right}</p>',
    ].join("");

    expect(renderAnnotationsInElement(document.body)).toBe(2);

    const labels = Array.from(document.querySelectorAll<HTMLElement>(
      ".crisp-ann__label",
    ));
    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      ".crisp-ann__target",
    ));
    expect(new Set(labels.map((label) => label.id)).size).toBe(2);
    expect(targets.map((target) => target.getAttribute("aria-describedby")))
      .toEqual(labels.map((label) => label.id));
  });

  it("opens an annotation for editing with a native double click or Shift+Enter", () => {
    document.body.innerHTML = [
      '<p><mark>可直接编辑</mark>{ann note="双击我" place=right}</p>',
    ].join("");
    const edited: HTMLElement[] = [];

    renderAnnotationsInElement(document.body, (wrapper) => edited.push(wrapper));

    const wrapper = document.querySelector<HTMLElement>(".crisp-ann");
    const label = document.querySelector<HTMLElement>(".crisp-ann__label");
    expect(label?.classList.contains("crisp-ann__label--editable")).toBe(true);
    expect(label?.getAttribute("tabindex")).toBe("0");

    label?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(edited).toEqual([wrapper]);

    label?.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      shiftKey: true,
    }));
    expect(edited).toEqual([wrapper, wrapper]);
  });

  it("masks and reveals a label immediately on single click", () => {
    document.body.innerHTML = '<p><mark>目标</mark>{ann note="点击自测"}</p>';
    renderAnnotationsInElement(document.body, () => {});
    const label = document.querySelector<HTMLElement>(".crisp-ann__label");

    label?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(label?.classList.contains("is-masked")).toBe(true);
    expect(label?.getAttribute("aria-pressed")).toBe("false");

    label?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(label?.classList.contains("is-masked")).toBe(false);
    expect(label?.getAttribute("aria-pressed")).toBe("true");
  });

  it("lets a native double click edit without leaving the label masked", () => {
    document.body.innerHTML = '<p><mark>目标</mark>{ann note="双击编辑"}</p>';
    const edited: HTMLElement[] = [];
    renderAnnotationsInElement(document.body, (wrapper) => edited.push(wrapper));
    const wrapper = document.querySelector<HTMLElement>(".crisp-ann");
    const label = document.querySelector<HTMLElement>(".crisp-ann__label");

    label?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(label?.classList.contains("is-masked")).toBe(true);
    label?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 2 }));
    label?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, detail: 2 }));

    expect(edited).toEqual([wrapper]);
    expect(label?.classList.contains("is-masked")).toBe(false);
    expect(label?.classList.contains("is-revealed")).toBe(false);
  });

  it("reads recall mode from the label owner document", () => {
    const popoutDocument = document.implementation.createHTMLDocument("popout");
    popoutDocument.body.setAttribute("data-crisp-ann-recall", "true");
    popoutDocument.body.innerHTML = '<p><mark>目标</mark>{ann note="弹窗答案"}</p>';
    renderAnnotationsInElement(popoutDocument.body, () => {});
    const label = popoutDocument.querySelector<HTMLElement>(".crisp-ann__label");

    label?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    expect(label?.classList.contains("is-revealed")).toBe(true);
    expect(label?.classList.contains("is-masked")).toBe(false);
    expect(label?.getAttribute("aria-pressed")).toBe("true");
  });

  it("uses Enter for recall and Shift+Enter as the keyboard edit action", () => {
    document.body.innerHTML = '<p><mark>目标</mark>{ann note="键盘操作"}</p>';
    const edited: HTMLElement[] = [];
    renderAnnotationsInElement(document.body, (wrapper) => edited.push(wrapper));
    const wrapper = document.querySelector<HTMLElement>(".crisp-ann");
    const label = document.querySelector<HTMLElement>(".crisp-ann__label");

    label?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect(label?.classList.contains("is-masked")).toBe(true);
    expect(edited).toEqual([]);

    label?.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Enter",
      shiftKey: true,
    }));
    expect(edited).toEqual([wrapper]);
  });

  it("renders notes whose escaped quotes were unescaped by Markdown", () => {
    // Source: ==目标=={ann note="他说\"好\"" color=red}
    document.body.innerHTML = '<p id="p"><mark>目标</mark>{ann note="他说"好"" color=red} 后文</p>';

    expect(renderAnnotationsInElement(document.body)).toBe(1);
    expect(document.querySelector(".crisp-ann__label")?.textContent).toBe('他说"好"');
    expect(document.querySelector(".crisp-ann")?.classList.contains("crisp-ann--red")).toBe(true);
    expect(document.querySelector("#p")?.textContent).toBe('目标他说"好" 后文');
  });

  it("renders notes that Markdown split into inline elements", () => {
    document.body.innerHTML = [
      '<p id="p"><mark>目标</mark>{ann note="看 <strong>重点</strong> 和 ',
      '<code>code</code>" place=top} 后文</p>',
    ].join("");

    expect(renderAnnotationsInElement(document.body)).toBe(1);
    expect(document.querySelector(".crisp-ann__label")?.textContent).toBe("看 重点 和 code");
    expect(document.querySelector(".crisp-ann")?.classList.contains("crisp-ann--top")).toBe(true);
    expect(document.querySelector("#p strong")).toBeNull();
    expect(document.querySelector("#p")?.textContent).toBe("目标看 重点 和 code 后文");
  });

  it("renders notes whose closing brace was swallowed by an autolink", () => {
    document.body.innerHTML = [
      '<p id="p"><mark>目标</mark>{ann note="见 ',
      '<a href="https://x.com/a%22%7D">https://x.com/a"}</a> 后文</p>',
    ].join("");

    expect(renderAnnotationsInElement(document.body)).toBe(1);
    expect(document.querySelector(".crisp-ann__label")?.textContent).toBe("见 https://x.com/a");
    expect(document.querySelector("#p a")).toBeNull();
    expect(document.querySelector("#p")?.textContent).toBe("目标见 https://x.com/a 后文");
  });

  it("leaves unrelated marks and incomplete directives untouched", () => {
    document.body.innerHTML = [
      '<p id="a"><mark>plain</mark> {ann note="x"}</p>',
      '<p id="b"><mark>open</mark>{ann note="never closed <em>x</em></p>',
    ].join("");

    expect(renderAnnotationsInElement(document.body)).toBe(0);
    expect(document.querySelector("#b em")).not.toBeNull();
    expect(document.querySelectorAll(".crisp-ann")).toHaveLength(0);
  });
});
