import { describe, expect, it } from "vitest";

import { applyCustomOrder, moveInOrder, parseStoredOrder } from "./customOrder";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("applyCustomOrder", () => {
  it("when the order lists every item, should follow it", () => {
    expect(ids(applyCustomOrder(items, ["c", "a", "d", "b"]))).toEqual(["c", "a", "d", "b"]);
  });

  it("when there are new items and stale ids, should ignore the stale and put the new at the end", () => {
    expect(ids(applyCustomOrder(items, ["c", "zzz", "a"]))).toEqual(["c", "a", "b", "d"]);
  });

  it("when the order is empty, should keep the original sequence", () => {
    expect(ids(applyCustomOrder(items, []))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("moveInOrder", () => {
  const visible = ["a", "b", "c", "d"];

  it("when moving forward, should take the target's place", () => {
    expect(moveInOrder(visible, [], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });

  it("when moving backward, should take the target's place", () => {
    expect(moveInOrder(visible, [], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("when some stored ids are filtered out, should keep them after the visible ones", () => {
    expect(moveInOrder(["a", "b"], ["x", "a", "b", "y"], "b", "a")).toEqual(["b", "a", "x", "y"]);
  });

  it("when dropping on itself or on an unknown id, should keep the order", () => {
    expect(moveInOrder(visible, [], "a", "a")).toEqual(visible);
    expect(moveInOrder(visible, [], "a", "nope")).toEqual(visible);
  });
});

describe("parseStoredOrder", () => {
  it.each([
    ['["a","b"]', ["a", "b"]],
    ["[1]", null],
    ["{}", null],
    ["not json", null],
    [null, null],
  ])("when the stored text is %j, should return %j", (raw, expected) => {
    expect(parseStoredOrder(raw)).toEqual(expected);
  });
});
