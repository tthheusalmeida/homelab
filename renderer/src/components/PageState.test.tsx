import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PageError, PageLoading } from "./PageState";

describe("PageLoading", () => {
  it("when rendered, should show the default loading message centered in the page", () => {
    const { container } = render(<PageLoading />);

    expect(screen.getAllByText("Carregando").length).toBeGreaterThan(0);
    expect(container.firstElementChild).toHaveClass("min-h-[80dvh]", "justify-center");
  });

  it("when given a message, should show it", () => {
    render(<PageLoading message="Abrindo o livro" />);

    expect(screen.getAllByText("Abrindo o livro").length).toBeGreaterThan(0);
  });
});

describe("PageError", () => {
  it("when rendered, should show the messages inside a card", () => {
    const { container } = render(
      <PageError primaryMessage="Falhou" secondaryMessage="Tente depois" />,
    );

    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(screen.getByText("Tente depois")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("when there is an action, should offer the button and call it", async () => {
    const action = vi.fn();
    render(<PageError primaryMessage="Falhou" actionLabel="Voltar" action={action} />);

    await userEvent.click(screen.getByRole("button", { name: /Voltar/ }));

    expect(action).toHaveBeenCalledTimes(1);
  });
});
