import { afterEach, describe, expect, it, vi } from "vitest";

import {
  chapterElementId,
  goToElement,
  headingElementId,
} from "./reader";

describe("element ids", () => {
  it("when building ids, should prefix chapter and heading ids", () => {
    expect(chapterElementId("d1")).toBe("chapter-d1");
    expect(headingElementId("d1", "redes")).toBe("d1-redes");
  });
});

describe("goToElement", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("when the element exists, should scroll to it and highlight it for a moment", () => {
    vi.useFakeTimers();
    const element = document.createElement("h2");
    element.id = "alvo";
    element.scrollIntoView = vi.fn();
    document.body.appendChild(element);

    goToElement("alvo");

    expect(element.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(element).toHaveClass("bg-primary/15");
    // Com respiro: padding e margem negativa iguais, para o texto não se mexer.
    expect(element).toHaveClass("px-3", "-mx-3", "py-1.5", "-my-1.5");

    vi.advanceTimersByTime(2000);

    expect(element).not.toHaveClass("bg-primary/15", "px-3", "-mx-3", "py-1.5", "-my-1.5");
  });

  it("when the element does not exist, should do nothing", () => {
    expect(() => goToElement("nao-existe")).not.toThrow();
  });
});
