import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithSnackbar as render } from "#test/utils";
import userEvent from "@testing-library/user-event";

const suggestState = { mutate: vi.fn(), isPending: false, isError: false };

vi.mock("../hooks/useLibrary", () => ({
  useSuggestClassification: () => suggestState,
}));

// O chip da IA em uso tem testes próprios; aqui só interessa que a sugestão o mostra.
vi.mock("#components/AiInUse", () => ({
  AiInUse: () => <span data-testid="ai-in-use">IA em uso</span>,
}));

import { SuggestionPanel } from "./SuggestionPanel";

const suggestion = {
  title: "Novo",
  category: ["A", "B"],
  tags: ["x"],
  model: "gemini-3.1-flash-lite",
};

describe("SuggestionPanel", () => {
  const setup = (disabled = false) => {
    const onSuggestion = vi.fn();

    render(
      <SuggestionPanel
        documentId="id1"
        onSuggestion={onSuggestion}
        disabled={disabled}
      />,
    );

    return { onSuggestion, user: userEvent.setup() };
  };

  beforeEach(() => {
    suggestState.mutate.mockReset();
    suggestState.isPending = false;
    suggestState.isError = false;
  });

  it("when clicked, should ask for a suggestion with no model (the AI in use decides)", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Sugerir com IA" }));

    expect(suggestState.mutate).toHaveBeenCalledWith(
      { id: "id1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("when shown, should say which AI is in use and let the user switch it", () => {
    setup();

    expect(screen.getByTestId("ai-in-use")).toBeInTheDocument();
  });

  it("when the suggestion arrives, should hand it over and say which model was used", async () => {
    suggestState.mutate.mockImplementation(
      (_variables: unknown, options: { onSuccess: (s: unknown) => void }) =>
        options.onSuccess(suggestion),
    );
    const { user, onSuggestion } = setup();

    await user.click(screen.getByRole("button", { name: "Sugerir com IA" }));

    expect(onSuggestion).toHaveBeenCalledWith(suggestion);
    expect(
      screen.getByText("Sugestão preenchida com gemini-3.1-flash-lite."),
    ).toBeInTheDocument();
  });

  it("when the request fails, should show an error message", () => {
    suggestState.isError = true;
    setup();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível obter a sugestão",
    );
  });

  it("when the request is pending, should disable the button", () => {
    suggestState.isPending = true;
    setup();

    expect(screen.getByRole("button", { name: "Sugerir com IA" })).toBeDisabled();
  });

  it("when disabled, should disable the button", () => {
    setup(true);

    expect(screen.getByRole("button", { name: "Sugerir com IA" })).toBeDisabled();
  });
});
