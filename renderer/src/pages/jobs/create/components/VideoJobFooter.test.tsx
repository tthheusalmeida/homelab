import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithSnackbar as render } from "#test/utils";

import { Dialog, DialogContent, DialogForm, DialogHeader, DialogTitle } from "#ui/dialog";

import { VideoJobFooter } from "./VideoJobFooter";

const props = { linkCount: 1, canSubmit: true, isPending: false, isError: false };

describe("VideoJobFooter", () => {
  it("when ready, should offer an enabled submit button", () => {
    render(<VideoJobFooter {...props} />);

    expect(screen.getByRole("button")).toBeEnabled();
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("when not ready, should disable the button", () => {
    render(<VideoJobFooter {...props} canSubmit={false} />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("when sending, should show the spinner inside the button", () => {
    render(<VideoJobFooter {...props} isPending />);

    expect(screen.getByRole("button").querySelector("svg")).not.toBeNull();
  });

  it("when the creation failed, should say so", () => {
    render(<VideoJobFooter {...props} isError />);

    expect(screen.getByText("Não foi possível criar o job. Tente novamente.")).toBeInTheDocument();
  });

  it("when everything is fine, should not show an error", () => {
    render(<VideoJobFooter {...props} />);

    expect(screen.queryByText(/Não foi possível/)).toBeNull();
  });
});

describe("VideoJobFooter inside a dialog", () => {
  const renderInDialog = (isError: boolean) =>
    render(
      <Dialog open>
        <DialogContent bare>
          <DialogForm onSubmit={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Resumo de vídeo</DialogTitle>
            </DialogHeader>

            <p>campos do formulário</p>

            <VideoJobFooter {...props} isError={isError} />
          </DialogForm>
        </DialogContent>
      </Dialog>,
    );

  const body = () => screen.getByRole("dialog").querySelector("[data-slot=dialog-body]");

  it("when the form is long, should keep the submit button in the fixed footer, outside the scrolling body", () => {
    renderInDialog(false);

    const button = screen.getByRole("button", { name: /Criar/ });

    expect(body()).toContainElement(screen.getByText("campos do formulário"));
    expect(body()).not.toContainElement(button);
    expect(button.parentElement).toHaveAttribute("data-slot", "dialog-footer");
  });

  it("when the creation failed, should raise the error alert outside the form, without pushing the content", () => {
    renderInDialog(true);

    const error = screen.getByRole("alert");

    expect(error).toHaveTextContent("Não foi possível criar o job. Tente novamente.");
    expect(screen.getByRole("dialog")).not.toContainElement(error);
    expect(error.closest("[data-region]")).toHaveAttribute("data-region", "center");
  });
});
