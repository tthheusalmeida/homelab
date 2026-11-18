import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../library/hooks/useLibrary", () => ({
  useCategories: () => ({ data: [] }),
}));

import { JobDocumentFields } from "./JobDocumentFields";

const props = {
  idPrefix: "t",
  defaultTitle: "Transcrição de vídeo",
  title: "",
  onTitleChange: () => {},
  category: [] as string[],
  onCategoryChange: () => {},
  tags: [] as string[],
  onTagsChange: () => {},
};

const trigger = () => screen.getByRole("button", { name: /Dados da página/ });

describe("JobDocumentFields (collapsible)", () => {
  it("when rendered, should start collapsed with the section marked as optional", () => {
    render(<JobDocumentFields {...props} />);

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveTextContent("opcional");
  });

  it("when the header is clicked, should open the fields and close them on a second click", async () => {
    const user = userEvent.setup();
    render(<JobDocumentFields {...props} />);

    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("when nothing was filled, should not show the filled mark", () => {
    render(<JobDocumentFields {...props} />);

    expect(trigger()).not.toHaveTextContent("preenchido");
  });

  it.each([
    ["title", { title: "Aula 1" }],
    ["category", { category: ["Tecnologia"] }],
    ["tags", { tags: ["docker"] }],
  ])("when the %s is filled, should show the filled mark even while collapsed", (_name, extra) => {
    render(<JobDocumentFields {...props} {...extra} />);

    expect(trigger()).toHaveTextContent("preenchido");
  });

  it("when only spaces were typed in the title, should not show the filled mark", () => {
    render(<JobDocumentFields {...props} title="   " />);

    expect(trigger()).not.toHaveTextContent("preenchido");
  });

  it("when in batch mode, should lock the title and explain it", () => {
    render(<JobDocumentFields {...props} isBatch />);

    expect(screen.getByLabelText("Título")).toBeDisabled();
    expect(
      screen.getByText("Com vários links, cada documento usa o título padrão."),
    ).toBeInTheDocument();
  });
});
