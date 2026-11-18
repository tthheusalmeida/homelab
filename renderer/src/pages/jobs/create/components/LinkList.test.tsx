import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LinkList } from "./LinkList";

const links = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://site${i + 1}.com/video`);

const setup = (count: number, disabled = false) => {
  const handlers = { onEdit: vi.fn(), onRemove: vi.fn(), onClear: vi.fn() };

  render(<LinkList links={links(count)} disabled={disabled} {...handlers} />);

  return { user: userEvent.setup(), ...handlers };
};

describe("LinkList", () => {
  it("when there are no links, should render nothing", () => {
    const { container } = render(
      <LinkList links={[]} onEdit={vi.fn()} onRemove={vi.fn()} onClear={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("when there are up to 5 links, should show them all and no counter", () => {
    setup(5);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByText(/^\+\d+ link/)).not.toBeInTheDocument();
    expect(screen.getByText("5 de 50 links")).toBeInTheDocument();
  });

  it("when there are more than 5 links, should show 5 and a counter with the rest", () => {
    setup(8);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("+3 links")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver todos/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("when there is exactly one extra link, should use the singular in the counter", () => {
    setup(6);

    expect(screen.getByText("+1 link")).toBeInTheDocument();
  });

  it("when Ver todos is clicked, should list every link and offer to show less", async () => {
    const { user } = setup(8);

    await user.click(screen.getByRole("button", { name: /Ver todos/ }));

    expect(await screen.findByText("site8.com")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.getByRole("button", { name: /Mostrar menos/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("when the rest of the list is open, should keep numbering after the fifth", async () => {
    const { user } = setup(7);

    await user.click(screen.getByRole("button", { name: /Ver todos/ }));

    expect(await screen.findByRole("button", { name: "Remover link 7" })).toBeInTheDocument();
  });

  it("when Edit is clicked, should report that link", async () => {
    const { user, onEdit } = setup(3);

    await user.click(screen.getByRole("button", { name: "Editar link 2" }));

    expect(onEdit).toHaveBeenCalledWith("https://site2.com/video");
  });

  it("when Remove is clicked on a hidden link, should report that link", async () => {
    const { user, onRemove } = setup(8);

    await user.click(screen.getByRole("button", { name: /Ver todos/ }));
    await user.click(await screen.findByRole("button", { name: "Remover link 8" }));

    expect(onRemove).toHaveBeenCalledWith("https://site8.com/video");
  });

  it("when there is more than one link, should offer to clear the list", async () => {
    const { user, onClear } = setup(2);

    await user.click(screen.getByRole("button", { name: "Limpar lista" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("when there is only one link, should not offer to clear the list", () => {
    setup(1);

    expect(screen.queryByRole("button", { name: "Limpar lista" })).not.toBeInTheDocument();
  });

  it("when a link has a path, should show the site in evidence and the full link as title", () => {
    render(
      <LinkList
        links={["https://www.youtube.com/watch?v=abc"]}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("youtube.com")).toBeInTheDocument();
    expect(screen.getByTitle("https://www.youtube.com/watch?v=abc")).toHaveTextContent("/watch?v=abc");
  });

  it("when disabled, should lock edit, remove and clear", () => {
    setup(2, true);

    expect(screen.getByRole("button", { name: "Editar link 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remover link 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Limpar lista" })).toBeDisabled();
  });
});

describe("LinkList (very long link)", () => {
  const long = `https://www.youtube.com/watch?v=${"abcdefghij".repeat(40)}`;

  it("when a link is very long, should cut it with an ellipsis instead of widening the row, keeping the full link as title", () => {
    render(<LinkList links={[long]} onEdit={vi.fn()} onRemove={vi.fn()} onClear={vi.fn()} />);

    const text = screen.getByTitle(long);

    expect(text).toHaveClass("truncate");
    expect(text).toHaveClass("min-w-0");
    expect(text.closest("li")).toHaveClass("min-w-0");
  });
});
