import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mutate = vi.fn();
const state = { isPending: false, isError: false };

vi.mock("../hooks/useCreateVideoToTranscript", () => ({
  useCreateVideoToTranscript: () => ({ mutate, ...state }),
}));
vi.mock("../hooks/useCreateVideoToSummary", () => ({
  useCreateVideoToSummary: () => ({ mutate, ...state }),
}));
vi.mock("../../../ai/chat/hooks/useAiProviders", () => ({
  useAiProviders: () => ({
    data: [{ id: "gemini", label: "Gemini" }],
    isLoading: false,
  }),
}));
vi.mock("../../../ai/chat/hooks/useAiModels", () => ({
  useAiModels: () => ({
    data: [{ id: "m1", label: "Modelo 1" }],
    isLoading: false,
  }),
}));
vi.mock("../../../ai/chat/hooks/useAiThinking", () => ({
  useAiThinking: () => ({
    data: [{ id: "off", label: "Desativado" }],
    isLoading: false,
  }),
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

import { JobForm } from "./JobForm";
import { VideoToSummaryForm } from "./VideoToSummaryForm";
import { VideoToTranscriptForm } from "./VideoToTranscriptForm";

/** Faz o `mutate` de mentira responder com sucesso, como o servidor responderia. */
const succeed = () =>
  mutate.mockImplementation(
    (_params: unknown, options: { onSuccess: (result: unknown) => void }) =>
      options.onSuccess({ created: 1, failed: [] }),
  );

async function chooseModel(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Provedor"), "gemini");
  await user.selectOptions(screen.getByLabelText("Modelo"), "m1");
  await user.selectOptions(screen.getByLabelText("Thinking"), "off");
}

describe("job forms — after the job is created", () => {
  beforeEach(() => {
    mutate.mockReset();
    state.isPending = false;
    state.isError = false;
  });

  describe("transcript form", () => {
    it("when the job is created, should report it", async () => {
      succeed();
      const onCreated = vi.fn();
      const user = userEvent.setup();
      render(<VideoToTranscriptForm onCreated={onCreated} />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await user.click(screen.getByRole("button", { name: /criar/i }));

      expect(onCreated).toHaveBeenCalledTimes(1);
    });

    it("when the creation fails, should not report it and keep the form usable", async () => {
      mutate.mockImplementation(() => {});
      const onCreated = vi.fn();
      const user = userEvent.setup();
      render(<VideoToTranscriptForm onCreated={onCreated} />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await user.click(screen.getByRole("button", { name: /criar/i }));

      expect(onCreated).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Links dos vídeos")).toBeEnabled();
      expect(screen.getByRole("button", { name: /criar/i })).toBeEnabled();
    });

    it("when the job is created, should lock the form so it cannot be sent again", async () => {
      succeed();
      const user = userEvent.setup();
      render(<VideoToTranscriptForm />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await user.click(screen.getByRole("button", { name: /criar/i }));

      expect(screen.getByLabelText("Links dos vídeos")).toBeDisabled();
      expect(screen.getByRole("button", { name: /criar/i })).toBeDisabled();
      expect(screen.getByLabelText("Título")).toBeDisabled();
    });

    it("when the form is submitted again after the job was created, should not create a second job", async () => {
      succeed();
      const user = userEvent.setup();
      render(<VideoToTranscriptForm />);
      const url = screen.getByLabelText("Links dos vídeos");

      await user.type(url, "https://x.com/v");
      await user.click(screen.getByRole("button", { name: /criar/i }));
      // Enter num campo habilitado reenviaria; aqui o formulário já está travado.
      (url.closest("form") as HTMLFormElement).requestSubmit();

      expect(mutate).toHaveBeenCalledTimes(1);
    });

    it("when the job is being sent, should ignore a second submit", async () => {
      state.isPending = true;
      render(<VideoToTranscriptForm />);

      (
        screen.getByLabelText("Links dos vídeos").closest("form") as HTMLFormElement
      ).requestSubmit();

      expect(mutate).not.toHaveBeenCalled();
    });

    it("when no onCreated is given, should still create the job without errors", async () => {
      succeed();
      const user = userEvent.setup();
      render(<VideoToTranscriptForm />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await user.click(screen.getByRole("button", { name: /criar/i }));

      expect(mutate).toHaveBeenCalledTimes(1);
    });
  });

  describe("summary form", () => {
    it("when the job is created, should report it and lock the form", async () => {
      succeed();
      const onCreated = vi.fn();
      const user = userEvent.setup();
      render(<VideoToSummaryForm onCreated={onCreated} />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await chooseModel(user);
      await user.click(screen.getByRole("button", { name: /criar/i }));

      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Links dos vídeos")).toBeDisabled();
      expect(screen.getByRole("button", { name: /criar/i })).toBeDisabled();
      expect(screen.getByLabelText("Nível de detalhe")).toBeDisabled();
      expect(screen.getByLabelText("Modelo")).toBeDisabled();
    });

    it("when submitted again after the job was created, should not create a second job", async () => {
      succeed();
      const user = userEvent.setup();
      render(<VideoToSummaryForm />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await chooseModel(user);
      await user.click(screen.getByRole("button", { name: /criar/i }));
      (
        screen.getByLabelText("Links dos vídeos").closest("form") as HTMLFormElement
      ).requestSubmit();

      expect(mutate).toHaveBeenCalledTimes(1);
    });

    it("when the creation fails, should keep the form open and editable", async () => {
      mutate.mockImplementation(() => {});
      const onCreated = vi.fn();
      const user = userEvent.setup();
      render(<VideoToSummaryForm onCreated={onCreated} />);

      await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v");
      await chooseModel(user);
      await user.click(screen.getByRole("button", { name: /criar/i }));

      expect(onCreated).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Links dos vídeos")).toBeEnabled();
    });
  });

  describe("JobForm", () => {
    it.each([
      ["video-to-transcript", "Links dos vídeos"],
      ["video-to-summary", "Links dos vídeos"],
    ])(
      "when the type is %s, should pass onCreated to the form",
      async (type) => {
        succeed();
        const onCreated = vi.fn();
        const user = userEvent.setup();
        render(
          <JobForm
            jobType={{ type, label: "L", description: "D" }}
            onCreated={onCreated}
          />,
        );

        await user.type(
          screen.getByLabelText("Links dos vídeos"),
          "https://x.com/v",
        );
        if (type === "video-to-summary") {
          await chooseModel(user);
        }
        await user.click(screen.getByRole("button", { name: /criar/i }));

        expect(onCreated).toHaveBeenCalledTimes(1);
      },
    );
  });
});
