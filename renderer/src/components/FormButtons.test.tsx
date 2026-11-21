import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormButtons } from "./FormButtons";

const setup = (props: Partial<React.ComponentProps<typeof FormButtons>> = {}) => {
  const onCancel = vi.fn();

  render(
    <form onSubmit={(event) => event.preventDefault()}>
      <FormButtons onCancel={onCancel} pending={false} canSubmit {...props}>
        Salvar
      </FormButtons>
    </form>,
  );

  return onCancel;
};

describe("FormButtons", () => {
  it("when rendered, should offer Cancelar and the main button with its label", () => {
    setup();

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("when Cancelar is clicked, should call onCancel and not submit", async () => {
    const onCancel = setup();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveAttribute("type", "button");
  });

  it("when it is not ready, should disable only the main button", () => {
    setup({ canSubmit: false });

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("when pending, should show the spinner on the main button and lock both", () => {
    setup({ pending: true });

    expect(screen.getByRole("button", { name: "Salvar" }).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });

  it("when another action is running (locked), should lock Cancelar without a spinner", () => {
    setup({ locked: true });

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" }).querySelector("svg")).toBeNull();
  });

  it("when there is no onSubmit, should be a submit button of the form", () => {
    setup();

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("type", "submit");
  });

  it("when onSubmit is given, should call it on click instead of submitting a form", async () => {
    const onSubmit = vi.fn();
    setup({ onSubmit });

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("type", "button");
  });

  it("when a custom cancel label is given, should use it", () => {
    setup({ cancelLabel: "Voltar" });

    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });
});
