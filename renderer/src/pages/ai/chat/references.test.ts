import { describe, expect, it } from "vitest";

import type { ChatReference } from "#shared/contracts/chat";

import { referenceLabel, referenceSection, referenceTarget, usedReferences } from "./references";

const reference = (overrides: Partial<ChatReference> = {}): ChatReference => ({
  documentId: "doc-1",
  title: "Práticas da Primeira Maneira",
  headingPath: ["Práticas da Primeira Maneira", "Fluxo de trabalho", "Visualizar o trabalho"],
  anchor: "visualizar-o-trabalho",
  category: [],
  ...overrides,
});

describe("referenceSection", () => {
  it("when the path is deep, should return the most specific section", () => {
    expect(referenceSection(reference())).toBe("Visualizar o trabalho");
  });

  it("when the path only repeats the page title, should have no section", () => {
    expect(referenceSection(reference({ headingPath: ["Práticas da Primeira Maneira"] }))).toBe("");
  });

  it("when the path is empty, should have no section", () => {
    expect(referenceSection(reference({ headingPath: [] }))).toBe("");
  });
});

describe("referenceLabel", () => {
  it("when there is a section, should join page and section", () => {
    expect(referenceLabel(reference())).toBe(
      "Práticas da Primeira Maneira › Visualizar o trabalho",
    );
  });

  it("when there is no section, should be the page title alone", () => {
    expect(referenceLabel(reference({ headingPath: [] }))).toBe("Práticas da Primeira Maneira");
  });
});

describe("referenceTarget", () => {
  it("when there is an anchor, should point at that section of the page", () => {
    expect(referenceTarget(reference())).toEqual({
      pathname: "/library/doc-1",
      hash: "#visualizar-o-trabalho",
    });
  });

  it("when there is no anchor, should point at the page with no hash", () => {
    expect(referenceTarget(reference({ anchor: null }))).toEqual({
      pathname: "/library/doc-1",
      hash: "",
    });
  });
});

describe("usedReferences", () => {
  it("when the same section is used in several answers, should list it once with the count", () => {
    const used = usedReferences([
      { references: [reference()] },
      {},
      { references: [reference(), reference({ documentId: "doc-2", anchor: "b" })] },
    ]);

    expect(used.map((item) => [item.reference.documentId, item.answers])).toEqual([
      ["doc-1", 2],
      ["doc-2", 1],
    ]);
  });

  it("when two sections of the same page are used, should keep them as different entries", () => {
    const used = usedReferences([
      { references: [reference({ anchor: "a" }), reference({ anchor: "b" })] },
    ]);

    expect(used).toHaveLength(2);
  });

  it("when no answer has references, should be empty", () => {
    expect(usedReferences([{}, { references: [] }])).toEqual([]);
  });
});
