import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { loadPieceShapes } from "#lib/infographic-piece-store";

// jsdom does not implement these browser APIs used by the UI libs.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// Never reports anything as visible (as if every item were off screen), so `LazyRender` keeps lists
// of heavy items light in tests; tests that need the content stub their own observer.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// Os desenhos das peças chegam sob demanda no app; nos testes já começam carregados, para que as telas
// com peças desenhem na hora. Os testes do carregamento em si usam `resetPieceShapesForTests`.
await loadPieceShapes();

Element.prototype.scrollIntoView = () => {};
Element.prototype.getAnimations = () => [];

window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList);

afterEach(() => {
  cleanup();
});
