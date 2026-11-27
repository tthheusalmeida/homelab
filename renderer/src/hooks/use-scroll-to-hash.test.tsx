import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { useScrollToHash } from "./use-scroll-to-hash";

function Page({ ready }: { ready: boolean }) {
  useScrollToHash(ready);

  return <h2 id="fluxo-de-trabalho">Fluxo de trabalho</h2>;
}

const open = (path: string, ready = true) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Page ready={ready} />
    </MemoryRouter>,
  );

describe("useScrollToHash", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.useRealTimers();
    scrollIntoView.mockClear();
  });

  it("when the address has a section and the page is ready, should scroll to it", () => {
    open("/library/doc-1#fluxo-de-trabalho");
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("when the section has accents encoded in the address, should still find it", () => {
    open("/library/doc-1#fluxo%2Dde%2Dtrabalho");
    vi.runAllTimers();

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("when the address has no section, should not scroll", () => {
    open("/library/doc-1");
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("when the page is not ready, should wait and not scroll", () => {
    open("/library/doc-1#fluxo-de-trabalho", false);
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("when the section does not exist on the page, should do nothing", () => {
    open("/library/doc-1#nao-existe");
    vi.runAllTimers();

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
