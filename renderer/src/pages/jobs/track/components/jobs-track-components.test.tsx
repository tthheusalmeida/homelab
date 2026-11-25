import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { Job, JobStepType } from "../../types/job.types";

import { JobList } from "./JobList";
import { JobListItem } from "./JobListItem";
import { JobStatusBadge } from "./JobStatusBadge";

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: "job-1",
  name: "video-to-transcript",
  label: "Transcrição de vídeo",
  status: "pending",
  createdAt: "2026-01-01T10:00:00.000Z",
  completedAt: "",
  steps: [],
  ...overrides,
});

const steps: JobStepType[] = [
  { name: "a", label: "Etapa A", status: "completed" },
  { name: "b", label: "Etapa B", status: "running" },
  { name: "c", label: "Etapa C", status: "pending" },
];

describe("JobStatusBadge", () => {
  it("when rendered, should be a hexagon with the content inside, not a pill", () => {
    const { container } = render(<JobStatusBadge status="completed" />);
    const tag = container.querySelector('[data-slot="badge"]');

    expect(tag).toHaveClass("rounded-none", "min-w-28");
    expect(tag?.className).toContain("clip-path");
    expect(tag).toHaveTextContent("Concluído");
  });

  it.each([
    ["completed", "bg-emerald-800", "text-emerald-300"],
    ["failed", "bg-destructive/10", "text-destructive"],
    ["pending", "bg-secondary", "text-secondary-foreground"],
    ["running", "bg-secondary", "text-secondary-foreground"],
  ])("when status is %s, should keep its colors (%s, %s)", (status, background, text) => {
    const { container } = render(<JobStatusBadge status={status as never} />);

    expect(container.querySelector('[data-slot="badge"]')).toHaveClass(background, text);
  });

  it("when status is running, should show the hexagon loader", () => {
    const { container } = render(<JobStatusBadge status="running" />);

    expect(container.querySelector(".hex-loader")).not.toBeNull();
  });

  it.each([
    ["pending", "Pendente"],
    ["running", "Em execução"],
    ["completed", "Concluído"],
    ["failed", "Falhou"],
  ])("when status is %s, should show the label %s", (status, label) => {
    render(<JobStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("JobListItem", () => {
  it("when rendered, should be a card with a small 4px radius, in the HomeLab theme, not a very rounded one", () => {
    const { container } = render(<JobListItem job={makeJob()} />);

    expect(container.querySelector('[data-slot="card"]')).toHaveClass("rounded-[4px]");
    expect(container.querySelector('[data-slot="card"]')).not.toHaveClass("rounded-xl");
  });

  it("when rendered, should show label, id and creation date", () => {
    render(<JobListItem job={makeJob()} />);

    expect(screen.getByText("Transcrição de vídeo")).toBeInTheDocument();
    expect(screen.getByText("job-1")).toBeInTheDocument();
    expect(screen.getByText(/Criado em/)).toBeInTheDocument();
  });

  it("when the job has start and completion times, should show the duration", () => {
    render(
      <JobListItem
        job={makeJob({
          status: "completed",
          startedAt: "2026-01-01T10:00:00.000Z",
          completedAt: "2026-01-01T10:00:02.500Z",
        })}
      />,
    );

    expect(screen.getByText("2.5s")).toBeInTheDocument();
  });

  it("when the job has not completed, should not show a duration badge", () => {
    render(
      <JobListItem
        job={makeJob({
          status: "failed",
          startedAt: "2026-01-01T10:00:00.000Z",
        })}
      />,
    );

    expect(screen.queryByText(/\d(ms|s|m|h)$/)).not.toBeInTheDocument();
  });

  it("when rendered, should show the status badge", () => {
    render(<JobListItem job={makeJob({ status: "failed" })} />);

    expect(screen.getByText("Falhou")).toBeInTheDocument();
  });
});

describe("JobList", () => {
  it("when given jobs, should sort them from newest to oldest", () => {
    const jobs = [
      makeJob({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeJob({ id: "new", createdAt: "2026-03-01T00:00:00.000Z" }),
      makeJob({ id: "mid", createdAt: "2026-02-01T00:00:00.000Z" }),
    ];

    const { container } = render(<JobList jobs={jobs} />);

    const ids = within(container)
      .getAllByText(/^(old|new|mid)$/)
      .map((el) => el.textContent);
    expect(ids).toEqual(["new", "mid", "old"]);
  });

  it("when sorting, should not mutate the received array", () => {
    const jobs = [
      makeJob({ id: "a", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeJob({ id: "b", createdAt: "2026-02-01T00:00:00.000Z" }),
    ];

    render(<JobList jobs={jobs} />);

    expect(jobs.map((j) => j.id)).toEqual(["a", "b"]);
  });
});
