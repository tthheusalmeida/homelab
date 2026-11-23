import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Job } from "../../types/job.types";

import { JobLiveProgress } from "./JobLiveProgress";

const steps = [
  { name: "transcribe", label: "Transcrever áudio", status: "completed" },
  { name: "summarize", label: "Resumir conteúdo", status: "running" },
];

const job = (overrides: Partial<Job> = {}) =>
  ({
    id: "j1",
    name: "video-to-summary",
    label: "Resumo",
    status: "running",
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: "",
    steps,
    ...overrides,
  }) as Job;

describe("JobLiveProgress (job fechado)", () => {
  it("when the running step has a retry note, should not show it here, only the step line", () => {
    render(
      <JobLiveProgress
        job={job({ note: "Tentando de novo (tentativa 2 de 3): serviço sobrecarregado" })}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/tentativa/)).not.toBeInTheDocument();
    expect(screen.getByText("etapa 2/2 · Resumir conteúdo")).toBeInTheDocument();
  });

  it("when the running step has a percent, should not show it here", () => {
    render(<JobLiveProgress job={job({ progress: { done: 10, total: 100, unit: "percent" } })} />);

    expect(screen.queryByText(/10%/)).not.toBeInTheDocument();
  });

  it("when the job is not running, should show nothing", () => {
    const { container } = render(<JobLiveProgress job={job({ status: "failed" })} />);

    expect(container).toBeEmptyDOMElement();
  });
});
