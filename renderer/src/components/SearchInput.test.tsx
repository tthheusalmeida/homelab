import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("when empty, should not be highlighted", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).not.toHaveAttribute("data-active");
    expect(screen.getByRole("searchbox").className).not.toContain("border-primary");
  });

  it("when it has text, should be highlighted with the accent color", () => {
    render(<SearchInput value="docker" onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("searchbox").className).toContain("border-primary/60");
  });

  it("when it has only spaces, should not count as a filter", () => {
    render(<SearchInput value="   " onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).not.toHaveAttribute("data-active");
  });

  it("when asked explicitly, should follow the active prop instead of the text", () => {
    render(<SearchInput value="" active onChange={vi.fn()} />);

    expect(screen.getByRole("searchbox")).toHaveAttribute("data-active", "true");
  });

  it("when typing, should call onChange with the text", async () => {
    const onChange = vi.fn();

    render(<SearchInput value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole("searchbox"), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });
});
