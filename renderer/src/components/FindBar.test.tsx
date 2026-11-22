import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FindBar } from "./FindBar";

const setup = (props: Partial<React.ComponentProps<typeof FindBar>> = {}) => {
  const handlers = {
    onChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onClose: vi.fn(),
  };

  render(
    <FindBar value="" count={0} index={-1} {...handlers} {...props} />,
  );

  return { ...handlers, user: userEvent.setup() };
};

const input = () => screen.getByLabelText("Pesquisar na página");

describe("FindBar", () => {
  it("when rendered, should float fixed, centered and at the very top, outside the page tree", () => {
    const { container } = render(
      <div>
        <FindBar
          value=""
          count={0}
          index={-1}
          onChange={() => {}}
          onNext={() => {}}
          onPrev={() => {}}
          onClose={() => {}}
        />
      </div>,
    );

    const bar = screen.getByRole("search");

    expect(container).not.toContainElement(bar);
    expect(bar).toHaveClass("fixed", "top-0", "mx-auto", "inset-x-0");
  });

  it("when rendered, should show the field with the Ctrl+F hint", () => {
    setup();

    expect(input()).toHaveAttribute(
      "placeholder",
      "Pesquisar na página... (Ctrl+F)",
    );
  });

  it("when a label is given, should use it in the field and the hint", () => {
    setup({ label: "Pesquisar no livro" });

    expect(screen.getByLabelText("Pesquisar no livro")).toHaveAttribute(
      "placeholder",
      "Pesquisar no livro... (Ctrl+F)",
    );
  });

  it("when typing, should report the text", async () => {
    const { onChange, user } = setup();

    await user.type(input(), "d");

    expect(onChange).toHaveBeenCalledWith("d");
  });

  it("when the query is short, should not show the counter or arrows", () => {
    setup({ value: "d" });

    expect(screen.queryByText(/ocorrência|de \d+/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Próxima ocorrência" }),
    ).not.toBeInTheDocument();
  });

  it("when there are matches, should show the current position and the total", () => {
    setup({ value: "docker", count: 12, index: 2 });

    expect(screen.getByText("3 de 12")).toBeInTheDocument();
  });

  it("when nothing matches, should say so and disable the arrows", () => {
    setup({ value: "zzz", count: 0, index: -1 });

    expect(screen.getByText("Nenhuma ocorrência")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Próxima ocorrência" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Ocorrência anterior" }),
    ).toBeDisabled();
  });

  it("when the arrows are clicked, should go to the next or previous occurrence", async () => {
    const { onNext, onPrev, user } = setup({
      value: "docker",
      count: 3,
      index: 0,
    });

    await user.click(
      screen.getByRole("button", { name: "Próxima ocorrência" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ocorrência anterior" }),
    );

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("when Enter is pressed, should go to the next occurrence; with Shift, to the previous", async () => {
    const { onNext, onPrev, user } = setup({
      value: "docker",
      count: 3,
      index: 0,
    });

    await user.type(input(), "{Enter}");
    await user.type(input(), "{Shift>}{Enter}{/Shift}");

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("when Escape is pressed with text, should only clear the search", async () => {
    const { onChange, onClose, user } = setup({
      value: "docker",
      count: 1,
      index: 0,
    });

    await user.type(input(), "{Escape}");

    expect(onChange).toHaveBeenCalledWith("");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("when Escape is pressed with an empty field, should close", async () => {
    const { onChange, onClose, user } = setup();

    await user.type(input(), "{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("when the close button is clicked, should close", async () => {
    const { onClose, user } = setup();

    await user.click(screen.getByRole("button", { name: "Fechar pesquisa" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("when an input ref is given, should point to the field", () => {
    const ref = { current: null as HTMLInputElement | null };
    setup({ inputRef: ref });

    expect(ref.current).toBe(input());
  });

  describe("results list", () => {
    const items = [
      { before: "uma ", match: "casa", after: " grande" },
      { before: "outra ", match: "casa", after: "…" },
    ];

    it("when there are results, should list each snippet with the match in bold", () => {
      setup({
        value: "casa",
        count: 2,
        index: 0,
        results: { items, current: 0, onSelect: vi.fn() },
      });

      const list = screen.getByRole("list", { name: "Resultados da pesquisa" });

      expect(list.querySelectorAll("li")).toHaveLength(2);
      expect(list.querySelector("strong")).toHaveTextContent("casa");
      expect(screen.getAllByRole("button", { current: true })).toHaveLength(1);
    });

    it("when a result is clicked, should select its occurrence", async () => {
      const onSelect = vi.fn();
      const { user } = setup({
        value: "casa",
        count: 2,
        index: 0,
        results: { items, current: 0, onSelect },
      });

      await user.click(
        within(screen.getByRole("list")).getAllByRole("button")[1],
      );

      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it("when the query is short or there are no results, should not show the list", () => {
      setup({
        value: "c",
        results: { items, current: 0, onSelect: vi.fn() },
      });

      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });
});
