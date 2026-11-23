import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mutate = vi.fn();

vi.mock("../hooks/useCreateVideoToSummary", () => ({
  useCreateVideoToSummary: () => ({ mutate, isPending: false, isError: false }),
}));
vi.mock("../../../ai/chat/hooks/useAiProviders", () => ({
  useAiProviders: () => ({
    data: [{ id: "gemini", label: "Gemini" }],
    isLoading: false,
  }),
}));
vi.mock("../../../ai/chat/hooks/useAiModels", () => ({
  useAiModels: () => ({ data: [{ id: "m1", label: "Modelo 1" }], isLoading: false }),
}));
vi.mock("../../../ai/chat/hooks/useAiThinking", () => ({
  useAiThinking: () => ({ data: [{ id: "off", label: "Desativado" }], isLoading: false }),
}));
vi.mock("../../../library/hooks/useLibrary", () => ({
  useCategories: () => ({ data: [] }),
}));

// O select real é do Base UI; aqui basta um select nativo para escolher.
vi.mock("#components/OptionSelect", () => ({
  OptionSelect: ({
    placeholder,
    options,
    value,
    disabled,
    onValueChange,
  }: {
    placeholder: string;
    options: { id: string; label: string }[];
    value?: string;
    disabled?: boolean;
    onValueChange: (value: string | null) => void;
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value || null)}
    >
      <option value="">-</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import { VideoToSummaryForm } from "./VideoToSummaryForm";

const input = () => screen.getByLabelText("Links dos vídeos");

async function chooseModel(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Provedor"), "gemini");
  await user.selectOptions(screen.getByLabelText("Modelo"), "m1");
  await user.selectOptions(screen.getByLabelText("Pensar"), "off");
}

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(input());
  await user.paste(text);
}

describe("VideoToSummaryForm (batch)", () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it("when several links are pasted, should send them with the same model choice and detail", async () => {
    const user = userEvent.setup();
    render(<VideoToSummaryForm />);

    await paste(user, "https://x.com/a\nhttps://x.com/b");
    await chooseModel(user);
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(mutate).toHaveBeenCalledWith(
      {
        urls: ["https://x.com/a", "https://x.com/b"],
        providerId: "gemini",
        modelId: "m1",
        thinking: "off",
        detail: "detailed",
      },
      expect.any(Object),
    );
  });

  it("when several links are pasted but no model is chosen, should keep the submit disabled", async () => {
    const user = userEvent.setup();
    render(<VideoToSummaryForm />);

    await paste(user, "https://x.com/a\nhttps://x.com/b");

    expect(screen.getByRole("button", { name: /criar 2 tarefas/i })).toBeDisabled();
  });

  it("when several links are pasted, should disable the title and not send it", async () => {
    const user = userEvent.setup();
    render(<VideoToSummaryForm />);

    await user.type(screen.getByLabelText("Título"), "Resumo X");
    await paste(user, "https://x.com/a\nhttps://x.com/b");
    await chooseModel(user);

    expect(screen.getByLabelText("Título")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(mutate.mock.calls[0][0]).not.toHaveProperty("title");
  });

  it("when only part of the batch is created, should keep the failed links and warn", async () => {
    mutate.mockImplementation(
      (_params: unknown, options: { onSuccess: (result: unknown) => void }) =>
        options.onSuccess({ created: 1, failed: ["https://x.com/b"] }),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<VideoToSummaryForm onCreated={onCreated} />);

    await paste(user, "https://x.com/a\nhttps://x.com/b");
    await chooseModel(user);
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("list")).toHaveTextContent("x.com/b");
    expect(screen.getByRole("status")).toHaveTextContent("1 de 2 tarefas foram criadas");
  });
});
