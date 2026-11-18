import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

import { SnackbarProvider } from "#components/Snackbar";

const mutate = vi.fn();
const jobTypes = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
};

vi.mock("./hooks/useJobsTypes", () => ({
  useJobTypes: () => jobTypes,
}));
vi.mock("./hooks/useCreateVideoToTranscript", () => ({
  useCreateVideoToTranscript: () => ({
    mutate,
    isPending: false,
    isError: false,
  }),
}));
vi.mock("./hooks/useCreateVideoToSummary", () => ({
  useCreateVideoToSummary: () => ({
    mutate,
    isPending: false,
    isError: false,
  }),
}));
vi.mock("../../ai/chat/hooks/useAiProviders", () => ({
  useAiProviders: () => ({ data: [], isLoading: false }),
}));
vi.mock("../../ai/chat/hooks/useAiModels", () => ({
  useAiModels: () => ({ data: [], isLoading: false }),
}));
vi.mock("../../ai/chat/hooks/useAiThinking", () => ({
  useAiThinking: () => ({ data: [], isLoading: false }),
}));
vi.mock("../../library/hooks/useLibrary", () => ({
  useCategories: () => ({ data: [] }),
}));

import { CreatePage } from "./CreatePage";

const renderPage = () =>
  render(
    <SnackbarProvider>
      <MemoryRouter initialEntries={["/jobs/create"]}>
        <Routes>
          <Route path="/jobs/create" element={<CreatePage />} />
          <Route path="/jobs/track" element={<p>tela acompanhar</p>} />
        </Routes>
      </MemoryRouter>
    </SnackbarProvider>,
  );

async function createTranscript(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole("button", { name: /Criar/ })[0]);
  await user.type(screen.getByLabelText("Links dos vídeos"), "https://x.com/v.mp4");
  await user.click(screen.getByRole("button", { name: /^Criar$/ }));
}

describe("CreatePage — creating a job", () => {
  beforeEach(() => {
    mutate.mockReset();
    mutate.mockImplementation(
      (_params: unknown, options: { onSuccess: (result: unknown) => void }) =>
        options.onSuccess({ created: 1, failed: [] }),
    );
    jobTypes.data = [
      {
        type: "video-to-transcript",
        label: "Transcrição de vídeo",
        description: "Transcreve um vídeo",
      },
      {
        type: "video-to-summary",
        label: "Resumo de vídeo",
        description: "Resume um vídeo",
      },
    ];
    jobTypes.isLoading = false;
    jobTypes.isError = false;
  });

  it("when a type is chosen, should open the form window", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole("button", { name: /Criar/ })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Links dos vídeos")).toBeInTheDocument();
  });

  it("when the job is created, should close the window", async () => {
    const user = userEvent.setup();
    renderPage();

    await createTranscript(user);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("when the job is created, should tell it at the bottom center and go to the tracking screen", async () => {
    const user = userEvent.setup();
    renderPage();

    await createTranscript(user);

    const notice = await screen.findByRole("status");

    expect(notice).toHaveTextContent("Tarefa criada: Transcrição de vídeo");
    expect(notice.closest("[data-region]")).toHaveAttribute("data-region", "center");
    await user.click(screen.getByRole("button", { name: "Acompanhar" }));
    expect(screen.getByText("tela acompanhar")).toBeInTheDocument();
  });

  it("when the window is opened again after a job was created, should start clean", async () => {
    const user = userEvent.setup();
    renderPage();
    await createTranscript(user);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await user.click(screen.getAllByRole("button", { name: /Criar/ })[0]);

    expect(screen.getByLabelText("Links dos vídeos")).toHaveValue("");
    expect(screen.getByLabelText("Links dos vídeos")).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Criar$/ })).toBeDisabled();
  });

  it("when the notice is closed, should remove it", async () => {
    const user = userEvent.setup();
    renderPage();
    await createTranscript(user);
    await screen.findByRole("status");

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("when the window is closed without creating, should not show the notice", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByRole("button", { name: /Criar/ })[0]);

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("when the creation fails, should keep the window open and show no notice", async () => {
    mutate.mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();

    await createTranscript(user);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("when the job types fail to load, should show the error", () => {
    jobTypes.isError = true;
    jobTypes.data = undefined;
    renderPage();

    expect(screen.getByText(/falha ao carregar os tipos/)).toBeInTheDocument();
  });
});
