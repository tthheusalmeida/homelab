import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { JobLiveProgress } from "./JobLiveProgress";

const steps = [
  { name: "transcribe", label: "Transcrever áudio", status: "completed" },
  { name: "summarize", label: "Resumir conteúdo", status: "running" },
];

describe("JobLiveProgress (retry note)", () => {
  it("when the running job has a note, should show it so the user sees the attempt", () => {
    render(
      <JobLiveProgress
        job={{
          status: "running",
          steps,
          startedAt: new Date().toISOString(),
          note: "Tentando de novo (tentativa 2 de 3): O Gemini está sobrecarregado ou indisponível no momento.",
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("tentativa 2 de 3");
    expect(screen.getByRole("status")).toHaveTextContent("sobrecarregado");
  });

  it("when the running job has no note, should not show a status line", () => {
    render(
      <JobLiveProgress
        job={{ status: "running", steps, startedAt: new Date().toISOString() }}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("when the job is not running, should not show the note", () => {
    const { container } = render(
      <JobLiveProgress job={{ status: "failed", steps, note: "aviso antigo" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
