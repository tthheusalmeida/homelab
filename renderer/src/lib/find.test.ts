import { describe, expect, it } from "vitest";

import { findMatches, searchPhrase, searchTerms } from "./find";

describe("searchTerms", () => {
  it("when the query has several words, should split them", () => {
    expect(searchTerms("imagem docker")).toEqual(["imagem", "docker"]);
  });

  it("when the query has accents and capitals, should fold them", () => {
    expect(searchTerms("Contêiner AÇÃO")).toEqual(["conteiner", "acao"]);
  });

  it("when words repeat, should keep each once", () => {
    expect(searchTerms("docker Docker DOCKER")).toEqual(["docker"]);
  });

  it("when a word has less than 2 letters, should ignore it", () => {
    expect(searchTerms("a de x")).toEqual(["de"]);
  });

  it("when the query is blank, should return nothing", () => {
    expect(searchTerms("   ")).toEqual([]);
  });

  it("when the query has short connectors, should drop them", () => {
    expect(searchTerms("casa da vida")).toEqual(["casa", "vida"]);
  });
});

describe("searchPhrase", () => {
  it("when the query has accents, capitals and extra spaces, should fold and collapse it", () => {
    expect(searchPhrase("  Casa   DA  Vida ")).toBe("casa da vida");
  });

  it("when the query has less than 2 letters, should return empty", () => {
    expect(searchPhrase(" a ")).toBe("");
  });
});

describe("findMatches", () => {
  it("when the term appears, should return each position", () => {
    expect(findMatches("o docker e o Docker", ["docker"])).toEqual([
      { start: 2, end: 8 },
      { start: 13, end: 19 },
    ]);
  });

  it("when the text has accents, should match the folded term and keep the original positions", () => {
    const text = "Os contêineres são ótimos";

    expect(findMatches(text, ["conteineres"])).toEqual([{ start: 3, end: 14 }]);
    expect(findMatches(text, ["otimos"])).toEqual([{ start: 19, end: 25 }]);
  });

  it("when the term has no accent but the text does, or the other way around, should still match", () => {
    expect(findMatches("ação", ["acao"])).toEqual([{ start: 0, end: 4 }]);
    expect(
      findMatches("acao", ["ação".normalize("NFD").replace(/\p{M}/gu, "")]),
    ).toEqual([{ start: 0, end: 4 }]);
  });

  it("when there are several terms, should return all of them in order", () => {
    expect(findMatches("rede e imagem", ["imagem", "rede"])).toEqual([
      { start: 0, end: 4 },
      { start: 7, end: 13 },
    ]);
  });

  it("when matches overlap, should merge them into one", () => {
    expect(findMatches("dockerfile", ["docker", "kerf"])).toEqual([
      { start: 0, end: 7 },
    ]);
  });

  it("when overlapping occurrences of one term exist, should still return them merged", () => {
    expect(findMatches("aaaa", ["aa"])).toEqual([{ start: 0, end: 4 }]);
  });

  it("when the phrase spans a line break or extra spaces, should match it as one", () => {
    expect(findMatches("A Casa  da\nVida", ["casa da vida"])).toEqual([
      { start: 2, end: 15 },
    ]);
  });

  it("when the term is inside other words, should match it too", () => {
    expect(findMatches("a casa, casamento e encasar", ["casa"])).toEqual([
      { start: 2, end: 6 },
      { start: 8, end: 12 },
      { start: 22, end: 26 },
    ]);
  });

  it("when nothing matches or the input is empty, should return nothing", () => {
    expect(findMatches("texto", ["zzz"])).toEqual([]);
    expect(findMatches("", ["a"])).toEqual([]);
    expect(findMatches("texto", [])).toEqual([]);
  });
});
