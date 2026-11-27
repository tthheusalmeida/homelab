import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PageHeader } from "./PageHeader";
import { PageHeaderSlotContext } from "./PageHeaderSlot";

describe("PageHeader compacto", () => {
  it("when compact, should keep the title, the command and the actions on one header without description", () => {
    render(
      <PageHeader
        compact
        title="Conversa"
        command="ai --chat"
        description="não aparece"
        actions={<button>Provedor</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Conversa" })).toBeInTheDocument();
    expect(screen.getByText("ai --chat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Provedor" })).toBeInTheDocument();
    expect(screen.queryByText("não aparece")).not.toBeInTheDocument();
  });
});

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

  it('when there is a header slot (inside the app layout), should draw the header there, outside the scroll area', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);

    render(
      <PageHeaderSlotContext.Provider value={slot}>
        <div data-testid="content">
          <PageHeader title="Início" command="home" />
        </div>
      </PageHeaderSlotContext.Provider>,
    );

    expect(slot).toContainElement(screen.getByRole('banner'));
    expect(screen.getByTestId('content')).not.toContainElement(screen.getByRole('banner'));
    expect(screen.getByRole('banner').className).not.toContain('sticky');

    slot.remove();
  });

  it('when there is no header slot, should render the header where it was written', () => {
    render(
      <div data-testid="content">
        <PageHeader title="Início" command="home" />
      </div>,
    );

    expect(screen.getByTestId('content')).toContainElement(screen.getByRole('banner'));
  });

  it('when a toolbar is given, should render the filters inside the pinned header, below the description', () => {
    render(
      <PageHeader
        title="Páginas"
        command="library --pages"
        description="Filtre."
        toolbar={<input aria-label="Buscar" />}
      />,
    );

    const header = screen.getByRole('banner');

    expect(header).toContainElement(screen.getByLabelText('Buscar'));
    expect(
      screen.getByText('Filtre.').compareDocumentPosition(screen.getByLabelText('Buscar')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
