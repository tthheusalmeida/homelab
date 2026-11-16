import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("when rendered, should show the title as the page heading and the terminal command", () => {
    render(<PageHeader title="Nova tarefa" command="jobs --new" />);

    expect(screen.getByRole("heading", { level: 1, name: "Nova tarefa" })).toBeInTheDocument();
    expect(screen.getByText("root@homelab:~$")).toBeInTheDocument();
    expect(screen.getByText("jobs --new")).toBeInTheDocument();
  });

  it("when description, status and actions are given, should show them", () => {
    render(
      <PageHeader
        title="Em andamento"
        command="jobs --watch"
        description="Acompanhe."
        status={<span>2 em execução</span>}
        actions={<button>Selecionar</button>}
      />,
    );

    expect(screen.getByText("Acompanhe.")).toBeInTheDocument();
    expect(screen.getByText("2 em execução")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar" })).toBeInTheDocument();
  });

  it("when only the title and command are given, should not render empty description or status", () => {
    const { container } = render(<PageHeader title="Início" command="home" />);

    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});
