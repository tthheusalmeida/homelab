import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RecentRequests, RecentRequestsStrings } from "./RecentRequests";
import type { AiUsageRequest } from "../types/aiUsage.types";

const request = (patch: Partial<AiUsageRequest> = {}): AiUsageRequest => ({
  id: "r1",
  provider: "gemini",
  model: "gemini-2.5-flash",
  operation: "chat",
  inputTokens: 1000,
  outputTokens: 500,
  totalTokens: 1500,
  estimatedCost: 0.0012,
  latencyMs: 1200,
  success: true,
  createdAt: "2026-11-20T10:00:00.000Z",
  ...patch,
});

const rows = () => Array.from(document.querySelectorAll<HTMLElement>("tbody tr"));

describe("RecentRequests", () => {
  it("when there are requests, should list one row each with the columns in Portuguese", () => {
    render(<RecentRequests data={[request(), request({ id: "r2", model: "llama3" })]} />);

    for (const column of RecentRequestsStrings.columns) {
      expect(screen.getByRole("columnheader", { name: column })).toBeInTheDocument();
    }

    expect(rows()).toHaveLength(2);
    expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument();
  });

  it("when a request worked, should say Sucesso and show no error line", () => {
    render(<RecentRequests data={[request()]} />);

    expect(screen.getByText("Sucesso")).toBeInTheDocument();
    expect(rows()[0]).toHaveAttribute("data-status", "success");
    expect(document.querySelector('[data-slot="request-error"]')).toBeNull();
  });

  it("when a request failed, should highlight it and show the reason under the model", () => {
    render(
      <RecentRequests
        data={[request({ id: "f1", success: false, error: "Limite de uso atingido.", totalTokens: 0 })]}
      />,
    );

    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(rows()[0]).toHaveAttribute("data-status", "failed");
    expect(rows()[0]).toHaveClass("bg-destructive/5");
    expect(screen.getByText("Limite de uso atingido.")).toHaveAttribute("data-slot", "request-error");
  });

  it("when a failure has no recorded reason, should say there is no detail instead of leaving it blank", () => {
    render(<RecentRequests data={[request({ id: "f1", success: false })]} />);

    expect(screen.getByText(RecentRequestsStrings.failedWithoutReason)).toBeInTheDocument();
  });

  it("when the mouse goes over a failed badge, should show the full reason in the tooltip", async () => {
    render(<RecentRequests data={[request({ id: "f1", success: false, error: "Chave recusada." })]} />);

    await userEvent.hover(screen.getByText("Falhou"));

    expect(
      await screen.findByText("Chave recusada.", { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it("when successes and failures mix, should keep the order it receives (newest first)", () => {
    render(
      <RecentRequests
        data={[
          request({ id: "a", model: "novo", success: false, error: "x" }),
          request({ id: "b", model: "antigo" }),
        ]}
      />,
    );

    expect(rows()[0]).toHaveTextContent("novo");
    expect(rows()[1]).toHaveTextContent("antigo");
  });

  it("when there are no requests, should say so instead of showing an empty table", () => {
    render(<RecentRequests data={[]} />);

    expect(screen.getByText(RecentRequestsStrings.empty)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("when rendered, should say it shows the last 10 including the failed ones", () => {
    render(<RecentRequests data={[]} />);

    expect(screen.getByText(RecentRequestsStrings.subtitle)).toBeInTheDocument();
    expect(RecentRequestsStrings.subtitle).toMatch(/10/);
  });
});
