import { describe, expect, it } from "vitest";

import { describeDeleteResult } from "./delete-message";

describe("describeDeleteResult", () => {
  it("when one job was deleted, should say it in the singular", () => {
    expect(describeDeleteResult({ deleted: ["a"], skipped: [] })).toBe("1 processo excluído");
  });

  it("when several jobs were deleted, should say how many", () => {
    expect(describeDeleteResult({ deleted: ["a", "b", "c"], skipped: [] })).toBe(
      "3 processos excluídos",
    );
  });

  it("when some were kept because they are active, should add how many stayed", () => {
    expect(
      describeDeleteResult({
        deleted: ["a", "b"],
        skipped: [
          { id: "c", reason: "ACTIVE" },
          { id: "d", reason: "ACTIVE" },
        ],
      }),
    ).toBe("2 processos excluídos. 2 em andamento não foram excluídos.");
  });

  it("when only one active job was kept, should use the singular", () => {
    expect(
      describeDeleteResult({ deleted: ["a"], skipped: [{ id: "c", reason: "ACTIVE" }] }),
    ).toBe("1 processo excluído. 1 em andamento não foi excluído.");
  });

  it("when nothing was deleted because everything is active, should only say what stayed", () => {
    expect(
      describeDeleteResult({ deleted: [], skipped: [{ id: "c", reason: "ACTIVE" }] }),
    ).toBe("1 em andamento não foi excluído");
  });

  it("when nothing was deleted at all, should say so", () => {
    expect(describeDeleteResult({ deleted: [], skipped: [] })).toBe("Nenhum processo foi excluído");
  });

  it("when skipped ones no longer exist, should not count them as active", () => {
    expect(
      describeDeleteResult({ deleted: ["a"], skipped: [{ id: "x", reason: "NOT_FOUND" }] }),
    ).toBe("1 processo excluído");
  });
});
