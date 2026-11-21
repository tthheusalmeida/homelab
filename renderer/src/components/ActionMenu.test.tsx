import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download, Trash2 } from "lucide-react";

import { ActionMenu, type ActionMenuItem } from "./ActionMenu";

const item = (id: string, extra: Partial<ActionMenuItem> = {}): ActionMenuItem => ({
  id,
  label: id.toUpperCase(),
  onSelect: vi.fn(),
  ...extra,
});

describe("ActionMenu", () => {
  it("when rendered, should show only the trigger with the label and keep the options closed", () => {
    render(<ActionMenu label="Baixar" icon={Download} groups={[[item("png")]]} />);

    expect(screen.getByRole("button", { name: "Baixar" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("when the trigger is clicked, should list every option with its label", async () => {
    const user = userEvent.setup();

    render(<ActionMenu label="Baixar" groups={[[item("png"), item("pdf")]]} />);
    await user.click(screen.getByRole("button", { name: "Baixar" }));

    expect((await screen.findAllByRole("menuitem")).map((entry) => entry.textContent)).toEqual(["PNG", "PDF"]);
  });

  it("when an option is chosen, should run it and close the menu", async () => {
    const user = userEvent.setup();
    const png = item("png");

    render(<ActionMenu label="Baixar" groups={[[png]]} />);
    await user.click(screen.getByRole("button", { name: "Baixar" }));
    await user.click(await screen.findByRole("menuitem", { name: "PNG" }));

    expect(png.onSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menuitem")).toBeNull());
  });

  it("when there are several groups, should separate them with a line in the given order", async () => {
    const user = userEvent.setup();

    render(
      <ActionMenu
        label="Mais"
        groups={[[item("a")], [item("excluir", { label: "Excluir", destructive: true, icon: Trash2 })]]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Mais" }));

    expect(await screen.findAllByRole("separator")).toHaveLength(1);
    expect((await screen.findAllByRole("menuitem")).map((entry) => entry.textContent)).toEqual(["A", "Excluir"]);
  });

  it("when an option is destructive, should mark it as such", async () => {
    const user = userEvent.setup();

    render(<ActionMenu label="Mais" groups={[[item("x", { label: "Excluir", destructive: true })]]} />);
    await user.click(screen.getByRole("button", { name: "Mais" }));

    expect(await screen.findByRole("menuitem", { name: "Excluir" })).toHaveAttribute("data-variant", "destructive");
  });

  it("when an option is disabled, should not run it", async () => {
    const user = userEvent.setup();
    const png = item("png", { disabled: true });

    render(<ActionMenu label="Baixar" groups={[[png]]} />);
    await user.click(screen.getByRole("button", { name: "Baixar" }));
    await user.click(await screen.findByRole("menuitem", { name: "PNG" }));

    expect(png.onSelect).not.toHaveBeenCalled();
  });

  it("when iconOnly, should name the button by the label and show no visible text", () => {
    render(<ActionMenu label="Mais ações" iconOnly groups={[[item("a")]]} />);

    const button = screen.getByRole("button", { name: "Mais ações" });

    expect(button).toHaveAttribute("aria-label", "Mais ações");
    expect(button).not.toHaveTextContent("Mais ações");
  });

  it("when loading, should lock the trigger and show it as busy", () => {
    render(<ActionMenu label="Baixar" loading groups={[[item("png")]]} />);

    expect(screen.getByRole("button", { name: /Baixar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Baixar/ })).toHaveAttribute("aria-busy", "true");
  });

  it("when disabled, should not open", async () => {
    const user = userEvent.setup();

    render(<ActionMenu label="Baixar" disabled groups={[[item("png")]]} />);
    await user.click(screen.getByRole("button", { name: "Baixar" }));

    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("when every group is empty, should render nothing", () => {
    const { container } = render(<ActionMenu label="Baixar" groups={[[], []]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
