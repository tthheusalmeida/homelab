import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { MAX_BATCH_LINKS } from "../video-urls";
import { useLinksField } from "./useLinksField";

const link = (n: number | string) => `https://x.com/${n}`;
const setup = () => renderHook(() => useLinksField());

describe("useLinksField", () => {
  it("when links are added one by one, should list them in order", () => {
    const { result } = setup();

    act(() => result.current.add(link("a")));
    act(() => result.current.add(link("b")));

    expect(result.current.links).toEqual([link("a"), link("b")]);
    expect(result.current.urls).toEqual([link("a"), link("b")]);
  });

  it("when several links are pasted at once, should add all of them without repeats", () => {
    const { result } = setup();

    act(() => result.current.add(`${link("a")}\n${link("b")} ${link("a")}\n\n${link("c")}`));

    expect(result.current.links).toEqual([link("a"), link("b"), link("c")]);
    expect(result.current.draft).toBe("");
  });

  it("when a link is already in the list, should not duplicate it and say so", () => {
    const { result } = setup();

    act(() => result.current.add(link("a")));
    act(() => result.current.add(link("a")));

    expect(result.current.links).toEqual([link("a")]);
    expect(result.current.error).toBe("Esse link já está na lista.");
  });

  it("when several repeated links are pasted, should count how many were ignored", () => {
    const { result } = setup();

    act(() => result.current.add(`${link("a")} ${link("b")}`));
    act(() => result.current.add(`${link("a")} ${link("b")} ${link("c")}`));

    expect(result.current.links).toHaveLength(3);
    expect(result.current.error).toBe("2 links repetidos foram ignorados.");
  });

  it("when the text is not a valid link, should keep it in the field and show the error", () => {
    const { result } = setup();

    act(() => result.current.add("banana"));

    expect(result.current.links).toEqual([]);
    expect(result.current.draft).toBe("banana");
    expect(result.current.error).toBe("Informe um link que comece com http:// ou https://.");
    expect(result.current.canSubmit).toBe(false);
  });

  it("when valid and invalid links are mixed, should add the valid and keep the invalid in the field", () => {
    const { result } = setup();

    act(() => result.current.add(`${link("a")} ftp://x.com/b banana`));

    expect(result.current.links).toEqual([link("a")]);
    expect(result.current.draft).toBe("ftp://x.com/b banana");
  });

  it("when a valid link is only typed in the field, should count it as a link to send", () => {
    const { result } = setup();

    act(() => result.current.setDraft(link("a")));

    expect(result.current.links).toEqual([]);
    expect(result.current.urls).toEqual([link("a")]);
    expect(result.current.canSubmit).toBe(true);
  });

  it("when the typed link is already in the list, should not send it twice", () => {
    const { result } = setup();

    act(() => result.current.add(link("a")));
    act(() => result.current.setDraft(link("a")));

    expect(result.current.urls).toEqual([link("a")]);
  });

  it("when the field is half typed and loses focus, should show the invalid error and block sending", () => {
    const { result } = setup();

    act(() => result.current.setDraft("htt"));
    expect(result.current.error).toBeUndefined();

    act(() => result.current.touch());

    expect(result.current.error).toBe("Informe um link que comece com http:// ou https://.");
    expect(result.current.canSubmit).toBe(false);
  });

  it("when nothing was added, should not allow sending", () => {
    const { result } = setup();

    expect(result.current.canSubmit).toBe(false);
  });

  it("when more links than the limit are pasted, should keep only the limit and warn", () => {
    const { result } = setup();
    const text = Array.from({ length: MAX_BATCH_LINKS + 3 }, (_, i) => link(i)).join("\n");

    act(() => result.current.add(text));

    expect(result.current.links).toHaveLength(MAX_BATCH_LINKS);
    expect(result.current.error).toContain(String(MAX_BATCH_LINKS));
    expect(result.current.canSubmit).toBe(true);
  });

  it("when the list is full and one more valid link is typed, should block sending", () => {
    const { result } = setup();

    act(() =>
      result.current.add(Array.from({ length: MAX_BATCH_LINKS }, (_, i) => link(i)).join(" ")),
    );
    act(() => result.current.setDraft(link("extra")));

    expect(result.current.tooMany).toBe(true);
    expect(result.current.canSubmit).toBe(false);
  });

  it("when a link is removed, should leave the others untouched", () => {
    const { result } = setup();
    act(() => result.current.add(`${link("a")} ${link("b")} ${link("c")}`));

    act(() => result.current.remove(link("b")));

    expect(result.current.links).toEqual([link("a"), link("c")]);
  });

  it("when a link is edited, should move it back to the field", () => {
    const { result } = setup();
    act(() => result.current.add(`${link("a")} ${link("b")}`));

    act(() => result.current.edit(link("a")));

    expect(result.current.links).toEqual([link("b")]);
    expect(result.current.draft).toBe(link("a"));
  });

  it("when a link is edited while another is typed, should not lose the typed one", () => {
    const { result } = setup();
    act(() => result.current.add(link("a")));
    act(() => result.current.setDraft(link("typed")));

    act(() => result.current.edit(link("a")));

    expect(result.current.links).toEqual([link("typed")]);
    expect(result.current.draft).toBe(link("a"));
  });

  it("when the list is cleared, should empty both the list and the field", () => {
    const { result } = setup();
    act(() => result.current.add(`${link("a")} ${link("b")}`));
    act(() => result.current.setDraft(link("c")));

    act(() => result.current.clear());

    expect(result.current.links).toEqual([]);
    expect(result.current.draft).toBe("");
    expect(result.current.urls).toEqual([]);
  });

  it("when the whole batch was created, should say so", () => {
    const { result } = setup();
    act(() => result.current.add(link("a")));

    let complete = false;
    act(() => {
      complete = result.current.applyResult({ created: 1, failed: [] });
    });

    expect(complete).toBe(true);
    expect(result.current.partialMessage).toBeUndefined();
  });

  it("when part of the batch failed, should leave only the failed links in the list and explain", () => {
    const { result } = setup();
    act(() => result.current.add(`${link("a")} ${link("b")} ${link("c")}`));

    let complete = true;
    act(() => {
      complete = result.current.applyResult({ created: 1, failed: [link("b"), link("c")] });
    });

    expect(complete).toBe(false);
    expect(result.current.links).toEqual([link("b"), link("c")]);
    expect(result.current.partialMessage).toContain("1 de 3");
  });

  it("when the user changes the field after a partial batch, should clear the message", () => {
    const { result } = setup();
    act(() => {
      result.current.applyResult({ created: 1, failed: [link("b")] });
    });

    act(() => result.current.setDraft("x"));

    expect(result.current.partialMessage).toBeUndefined();
  });
});
