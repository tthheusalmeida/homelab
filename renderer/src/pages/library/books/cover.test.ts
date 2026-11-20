import { describe, expect, it } from "vitest";

import { ACCENT_IDS } from "#shared/contracts/appearance";

import {
  DEFAULT_COVER_COLOR,
  gradientOf,
  isValidCoverImageUrl,
} from "./cover";

describe("cover colors", () => {
  it.each([...ACCENT_IDS, "slate" as const])(
    "when the color is %s, should have a gradient of its own",
    (color) => {
      expect(gradientOf(color)).toMatch(
        new RegExp(`^from-${color}-\\d+ to-${color}-\\d+$`),
      );
    },
  );

  it("when asking for a gradient, should return the one of that color", () => {
    expect(gradientOf("rose")).toBe("from-rose-600 to-rose-900");
  });

  it("when the color is missing, should fall back to the first gradient", () => {
    expect(gradientOf(undefined)).toBe(gradientOf(DEFAULT_COVER_COLOR));
  });
});

describe("isValidCoverImageUrl", () => {
  it.each(["", "   ", "http://a.com/x.png", " https://a.com/x.png "])(
    "when the url is %p, should be valid",
    (value) => {
      expect(isValidCoverImageUrl(value)).toBe(true);
    },
  );

  it.each(["ftp://a.com/x.png", "javascript:alert(1)", "não é url", "a.com/x"])(
    "when the url is %p, should be invalid",
    (value) => {
      expect(isValidCoverImageUrl(value)).toBe(false);
    },
  );
});
