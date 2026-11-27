import { describe, expect, it } from "vitest";

import { checkContext } from "#shared/tokens";

import type { AiModel } from "./types/chat";
import {
  contextPercent,
  formatTokens,
  modelContextLimit,
  modelParameterBillions,
} from "./context";

describe("formatTokens", () => {
  it.each([
    [0, "~0 tokens"],
    [850, "~850 tokens"],
    [1_000, "~1,0 mil tokens"],
    [1_250, "~1,3 mil tokens"],
    [12_400, "~12 mil tokens"],
    [1_000_000, "~1,0 milhão de tokens"],
    [2_500_000, "~2,5 milhão de tokens"],
  ])("when the estimate is %i, should write %s", (tokens, text) => {
    expect(formatTokens(tokens)).toBe(text);
  });
});

describe("contextPercent", () => {
  it("when the model limit is known, should answer the rounded percentage", () => {
    expect(contextPercent(checkContext(8_500, 10_000))).toBe(85);
  });

  it("when the model limit is unknown, should answer null", () => {
    expect(contextPercent(checkContext(8_500, null))).toBeNull();
  });
});

describe("modelContextLimit", () => {
  const base = { id: "m", label: "M", providerId: "ollama" };

  it("when the model reports the context length in its details, should use it", () => {
    expect(modelContextLimit({ ...base, details: { context_length: 131072 } })).toBe(131072);
  });

  it("when only a context window is set, should use it", () => {
    expect(modelContextLimit({ ...base, contextWindow: 32000 })).toBe(32000);
  });

  it("when the model is unknown or reports 0, should answer null", () => {
    expect(modelContextLimit(undefined)).toBeNull();
    expect(modelContextLimit({ ...base, details: { context_length: 0 } })).toBeNull();
    expect(modelContextLimit(base)).toBeNull();
  });
});

describe("modelParameterBillions", () => {
  const model = (parameter_size?: string) =>
    ({ id: "m", label: "m", providerId: "ollama", details: { parameter_size } }) as AiModel;

  it.each([
    ["0.8B", 0.8],
    ["4B", 4],
    ["4.7B", 4.7],
    ["9 B", 9],
    ["560M", 0.56],
    ["70b", 70],
  ])("when the model reports %s, should read %s billion parameters", (text, expected) => {
    expect(modelParameterBillions(model(text))).toBeCloseTo(expected);
  });

  it.each([undefined, "", "grande", "0B"])(
    "when the size is %s, should be unknown",
    (text) => {
      expect(modelParameterBillions(model(text))).toBeNull();
    },
  );

  it("when there is no model, should be unknown", () => {
    expect(modelParameterBillions(undefined)).toBeNull();
  });
});
