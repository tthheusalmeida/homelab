import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithSnackbar as render } from "#test/utils";
import userEvent from "@testing-library/user-event";

const mutate = vi.fn();
const mutationState = { isPending: false, isError: false };

vi.mock("../hooks/useCreateVideoToTranscript", () => ({
  useCreateVideoToTranscript: () => ({ mutate, ...mutationState }),
}));
vi.mock("../hooks/useCreateVideoToSummary", () => ({
  useCreateVideoToSummary: () => ({ mutate, ...mutationState }),
}));
vi.mock("../../../ai/chat/hooks/useAiProviders", () => ({
  useAiProviders: () => ({ data: [{ id: "gemini", label: "Gemini" }], isLoading: false }),
}));
vi.mock("../../../ai/chat/hooks/useAiModels", () => ({
  useAiModels: () => ({ data: [{ id: "m1", label: "M1" }], isLoading: false }),
}));
vi.mock("../../../ai/chat/hooks/useAiThinking", () => ({
  useAiThinking: () => ({ data: [{ id: "off", label: "Off" }], isLoading: false }),
}));
vi.mock("../../../library/hooks/useLibrary", () => ({
  useCategories: () => ({ data: [] }),
}));

import { MAX_BATCH_LINKS } from "../video-urls";
import { VideoToTranscriptForm } from "./VideoToTranscriptForm";

const link = (n: number | string) => `https://x.com/${n}`;
const input = () => screen.getByLabelText("Links dos vídeos");

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(input());
  await user.paste(text);
}

describe("VideoToTranscriptForm (batch)", () => {
  beforeEach(() => {
    mutate.mockReset();
    mutationState.isPending = false;
    mutationState.isError = false;
  });

  it("when several links are pasted, should list them and send all of them in a single request", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, [link("a"), link("b"), link("c")].join("\n"));
    await user.click(screen.getByRole("button", { name: /criar 3 tarefas/i }));

    expect(mutate).toHaveBeenCalledWith(
      { urls: [link("a"), link("b"), link("c")] },
      expect.any(Object),
    );
  });

  it("when links are pasted one at a time, should keep adding to the list in order", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, link("a"));
    await paste(user, link("b"));
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(mutate).toHaveBeenCalledWith({ urls: [link("a"), link("b")] }, expect.any(Object));
  });

  it("when there is a single link, should keep the plain Criar label", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, link("a"));

    expect(screen.getByRole("button", { name: "Criar" })).toBeEnabled();
  });

  it("when a link is repeated, should count it once", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, [link("a"), link("a"), link("b")].join("\n"));

    expect(screen.getByRole("button", { name: "Criar 2 tarefas" })).toBeEnabled();
  });

  it("when there are more than 5 links, should show 5 rows and a counter with the rest", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, Array.from({ length: 8 }, (_, i) => link(i)).join("\n"));

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("+3 links")).toBeInTheDocument();
  });

  it("when there are several links, should disable the title and explain why", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await user.type(screen.getByLabelText("Título"), "Aula");
    await paste(user, `${link("a")} ${link("b")}`);

    expect(screen.getByLabelText("Título")).toBeDisabled();
    expect(
      screen.getByText("Com vários links, cada documento usa o título padrão."),
    ).toBeInTheDocument();
  });

  it("when there are several links and a title was typed, should not send the title but keep tags", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await user.type(screen.getByLabelText("Título"), "Aula");
    await user.type(screen.getByLabelText("Adicionar tag"), "docker{Enter}");
    await paste(user, `${link("a")} ${link("b")}`);
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(mutate).toHaveBeenCalledWith(
      { urls: [link("a"), link("b")], tags: ["docker"] },
      expect.any(Object),
    );
  });

  it("when there is a single link, should keep the title enabled", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, link("a"));

    expect(screen.getByLabelText("Título")).toBeEnabled();
  });

  it("when the limit of links is reached and more are pasted, should keep the limit and warn", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, Array.from({ length: MAX_BATCH_LINKS + 2 }, (_, i) => link(i)).join("\n"));

    expect(screen.getByRole("alert")).toHaveTextContent(`o máximo é ${MAX_BATCH_LINKS}`);
    expect(
      screen.getByRole("button", { name: `Criar ${MAX_BATCH_LINKS} tarefas` }),
    ).toBeEnabled();
  });

  it("when the text typed is not a link, should keep the submit disabled", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await user.type(input(), "banana");

    expect(screen.getByRole("button", { name: /criar/i })).toBeDisabled();
  });

  it("when the whole batch is created, should report it as created and lock the form", async () => {
    mutate.mockImplementation(
      (_params: unknown, options: { onSuccess: (result: unknown) => void }) =>
        options.onSuccess({ created: 2, failed: [] }),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<VideoToTranscriptForm onCreated={onCreated} />);

    await paste(user, `${link("a")} ${link("b")}`);
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(input()).toBeDisabled();
  });

  it("when only part of the batch is created, should keep only the failed links in the list, warn and not close", async () => {
    mutate.mockImplementation(
      (_params: unknown, options: { onSuccess: (result: unknown) => void }) =>
        options.onSuccess({ created: 1, failed: [link("b")] }),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<VideoToTranscriptForm onCreated={onCreated} />);

    await paste(user, `${link("a")} ${link("b")}`);
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));

    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("list")).toHaveTextContent("x.com/b");
    expect(input()).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 de 2 tarefas foram criadas. Os links abaixo falharam; revise e tente de novo.",
    );
  });

  it("when the field is changed after a partial batch, should clear the warning", async () => {
    mutate.mockImplementation(
      (_params: unknown, options: { onSuccess: (result: unknown) => void }) =>
        options.onSuccess({ created: 1, failed: [link("b")] }),
    );
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await paste(user, `${link("a")} ${link("b")}`);
    await user.click(screen.getByRole("button", { name: /criar 2 tarefas/i }));
    await user.type(input(), "h");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("when Enter is pressed in an empty field, should not add anything", async () => {
    const user = userEvent.setup();
    render(<VideoToTranscriptForm />);

    await user.type(input(), "{Enter}");

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
