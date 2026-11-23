import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Job } from "../../types/job.types";

import { JobList } from "./JobList";

const makeJob = (id: string, overrides: Partial<Job> = {}): Job => ({
  id,
  name: "video-to-transcript",
  label: `Job ${id}`,
  status: "running",
  createdAt: "2026-01-01T10:00:00.000Z",
  completedAt: "",
  steps: [],
  ...overrides,
});

describe("JobList", () => {
  it("when the parent passes a new cancel callback, should call the latest one", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const jobs = [makeJob("a")];
    const { rerender } = render(<JobList jobs={jobs} onCancel={first} />);

    rerender(<JobList jobs={jobs} onCancel={second} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("a");
  });

  it("when only one job changes, should keep the other rows untouched in the DOM", () => {
    const jobs = [makeJob("a"), makeJob("b", { createdAt: "2026-01-02T10:00:00.000Z" })];
    const { rerender } = render(<JobList jobs={jobs} />);
    const rowA = screen.getByText("Job a");

    rerender(<JobList jobs={[jobs[0], { ...jobs[1], label: "Job b2" }]} />);

    expect(screen.getByText("Job a")).toBe(rowA);
    expect(screen.getByText("Job b2")).toBeInTheDocument();
  });
});
