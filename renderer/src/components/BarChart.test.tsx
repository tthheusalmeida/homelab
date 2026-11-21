import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BarChart, type BarDatum } from "./BarChart";

const data: BarDatum[] = [
  { id: "a", label: "14/11", value: 15_000, tooltip: "Dia A: 15 mil" },
  { id: "b", label: "15/11", value: 60_000, tooltip: "Dia B: 60 mil" },
  { id: "c", label: "16/11", value: 0, tooltip: "Dia C: nada" },
];

const setup = (items = data) =>
  render(<BarChart data={items} formatTick={(value) => `${value / 1000}K`} ariaLabel="Consumo" />);

const columns = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="chart-column"]'));
const barOf = (column: HTMLElement) => column.querySelector<HTMLElement>('[data-slot="chart-bar"]')!;

describe("BarChart", () => {
  it("when rendered, should expose the chart to screen readers with its summary", () => {
    setup();

    expect(screen.getByRole("img", { name: "Consumo" })).toBeInTheDocument();
  });

  it("when rendered, should draw one column per item with its label under it", () => {
    setup();

    expect(columns()).toHaveLength(3);
    expect(screen.getByText("14/11")).toBeInTheDocument();
    expect(screen.getByText("16/11")).toBeInTheDocument();
  });

  it("when the values differ, should scale each bar to the round top of the axis", () => {
    setup();

    // 60 mil é o topo redondo: a barra de 60 mil enche, a de 15 mil ocupa 25%
    expect(barOf(columns()[1]).style.height).toContain("100%");
    expect(barOf(columns()[0]).style.height).toContain("25%");
  });

  it("when a value is zero, should draw no bar", () => {
    setup();

    expect(barOf(columns()[2]).style.height).toBe("0%");
    expect(barOf(columns()[2]).style.minHeight).toBe("0px");
  });

  it("when a value is tiny but not zero, should keep a visible sliver", () => {
    setup([
      { id: "a", label: "a", value: 1, tooltip: "x" },
      { id: "b", label: "b", value: 1_000_000, tooltip: "y" },
    ]);

    expect(barOf(columns()[0]).style.minHeight).toBe("2px");
  });

  it("when drawing the axis, should mark the round ticks from zero to the top and a grid line for each", () => {
    setup();

    for (const tick of ["0K", "15K", "30K", "45K", "60K"]) {
      expect(screen.getByText(tick)).toBeInTheDocument();
    }

    expect(document.querySelectorAll('[data-slot="chart-grid-line"]')).toHaveLength(5);
  });

  it("when all values are zero, should still render a stable chart", () => {
    setup(data.map((item) => ({ ...item, value: 0 })));

    expect(columns()).toHaveLength(3);
    expect(document.querySelectorAll('[data-slot="chart-grid-line"]')).toHaveLength(5);
  });

  it("when there is no data, should render the empty axes without breaking", () => {
    setup([]);

    expect(columns()).toHaveLength(0);
  });

  it("when the mouse goes over a column, should show the tooltip of that column", async () => {
    setup();

    await userEvent.hover(columns()[1]);

    expect(
      await screen.findByText("Dia B: 60 mil", { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it("when a column is named for assistive tech, should say its label and value", () => {
    setup();

    expect(columns()[0]).toHaveAttribute("aria-label", "14/11: 15000");
  });

  it("when the bars use the chart color, should come from the theme token and not a fixed color", () => {
    setup();

    expect(barOf(columns()[0])).toHaveClass("bg-chart-1");
  });
});
