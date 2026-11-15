import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UsagePage } from "./UsagePage";

const usage = {
  summary: {
    totalRequests: 3,
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    estimatedCost: 0.02,
    averageLatencyMs: 900,
  },
  timeline: [],
  byProvider: [],
  byModel: [],
  recentRequests: [],
};

vi.mock("./hooks/useAiUsage", () => ({
  useAiUsage: () => ({ data: usage, isLoading: false, isError: false }),
}));

describe("UsagePage", () => {
  it("when loaded, should say the numbers are the usage recorded by HomeLab, not the invoice", () => {
    render(<UsagePage />);

    expect(screen.getByText(/Consumo registrado pelo HomeLab/)).toBeInTheDocument();
    expect(screen.getByText(/Isto não é a fatura/)).toBeInTheDocument();
  });

  it("when loaded, should link to the real usage and billing panels of the provider", () => {
    render(<UsagePage />);

    expect(screen.getByRole("link", { name: /Consumo no Google AI Studio/ })).toHaveAttribute(
      "href",
      "https://aistudio.google.com/usage",
    );
    expect(screen.getByRole("link", { name: /Faturamento no Google Cloud/ })).toHaveAttribute(
      "href",
      "https://console.cloud.google.com/billing",
    );
  });

  it("when loaded, should title the page as Consumo de IA", () => {
    render(<UsagePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Consumo de IA" })).toBeInTheDocument();
  });
});
