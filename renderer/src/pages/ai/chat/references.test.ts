import { describe, expect, it } from "vitest";

import type { ChatReference } from "#shared/contracts/chat";

import {
  referenceLabel,
  referenceSection,
  referenceTarget,
  referencesByAnswer,
  usedReferences,
} from "./references";

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

describe("referencesByAnswer", () => {
  const message = (id: string, role: string, content: string, references?: ChatReference[]) => ({
    id,
    role,
    content,
    references,
  });

  it("when answers have references, should group them by answer with the question that came before", () => {
    const groups = referencesByAnswer([
      message("1", "user", "O que é DORA?"),
      message("2", "assistant", "r [1]", [reference({ number: 1 })]),
      message("3", "user", "oi"),
      message("4", "assistant", "olá"),
      message("5", "user", "E o Scrum?"),
      message("6", "assistant", "r [2]", [reference({ anchor: "b", number: 2 })]),
    ]);

    expect(groups.map((group) => [group.id, group.question, group.references[0].number])).toEqual([
      ["2", "O que é DORA?", 1],
      ["6", "E o Scrum?", 2],
    ]);
  });

  it("when the answer has no user message before it, should keep an empty question", () => {
    expect(referencesByAnswer([message("1", "assistant", "r", [reference()])])[0].question).toBe("");
  });

  it("when there are no references, should be empty", () => {
    expect(referencesByAnswer([message("1", "user", "p"), message("2", "assistant", "r")])).toEqual([]);
  });
});
