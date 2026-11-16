import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

import { IpcChannels } from "#shared/channels";
import { failure, mockApi, ok, payloadsOf } from "#test/api-mock";

import { SnackbarProvider } from "../../../components/Snackbar";
import { createTestQueryClient } from "../../../test/utils";
import type { Job } from "../types/job.types";

import { TrackPage } from "./TrackPage";

const makeJob = (id: string, status: Job["status"], extra: Partial<Job> = {}): Job => ({
  id,
  name: "video-to-summary",
  label: `Resumo ${id}`,
  status,
  createdAt: "2026-01-01T10:00:00.000Z",
  completedAt: "",
  steps: [],
  ...extra,
});

function setup(jobs: Job[], handlers: Record<string, (payload: unknown) => unknown> = {}) {
  const client = createTestQueryClient();
  const invoke = mockApi({
    [IpcChannels.jobs.list]: () => ok(jobs),
    ...handlers,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    );
  }

  render(<TrackPage />, { wrapper: Wrapper });

  return invoke;
}

describe("TrackPage — job actions", () => {
  it("when a job is running, should show the current step and a cancel button", async () => {
    setup([
      makeJob("a", "running", {
        startedAt: new Date().toISOString(),
        steps: [
          { name: "download", label: "Baixando vídeo", status: "completed" },
          { name: "audio", label: "Convertendo áudio", status: "running" },
          { name: "save", label: "Salvando", status: "pending" },
        ],
      }),
    ]);

    expect(await screen.findByText("etapa 2/3 · Convertendo áudio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("when a job is queued, should say it is in the queue", async () => {
    setup([makeJob("a", "pending")]);

    expect(await screen.findByText("na fila")).toBeInTheDocument();
  });

  it("when cancel is clicked, should ask the main to cancel that job and tell the user", async () => {
    const user = userEvent.setup();
    const invoke = setup([makeJob("a", "pending")], {
      [IpcChannels.jobs.cancel]: () => ok({ id: "a", outcome: "cancelled" }),
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.jobs.cancel)).toEqual([{ id: "a" }]));
    expect(await screen.findByText("Tarefa cancelada")).toBeInTheDocument();
  });

  it("when a running job is cancelled, should explain it stops after the current step", async () => {
    const user = userEvent.setup();
    setup([makeJob("a", "running", { startedAt: new Date().toISOString() })], {
      [IpcChannels.jobs.cancel]: () => ok({ id: "a", outcome: "cancelling" }),
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText(/para ao fim da etapa em andamento/)).toBeInTheDocument();
  });

  it("when cancelling fails, should show the error", async () => {
    const user = userEvent.setup();
    setup([makeJob("a", "pending")], {
      [IpcChannels.jobs.cancel]: () => failure("INTERNAL", "falha ao cancelar"),
    });

    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("falha ao cancelar");
  });

  it("when a job already asked to cancel, should not offer cancel again", async () => {
    setup([makeJob("a", "running", { cancelRequested: true, startedAt: new Date().toISOString() })]);

    expect(await screen.findByText("Cancelando ao fim da etapa…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("when a failed job is retryable, should retry it and announce the new attempt", async () => {
    const user = userEvent.setup();
    const invoke = setup([makeJob("f", "failed", { retryable: true })], {
      [IpcChannels.jobs.retry]: () => ok({ id: "novo", status: "pending" }),
    });

    await user.click(await screen.findByRole("button", { name: /Tentar de novo/ }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.jobs.retry)).toEqual([{ id: "f" }]));
    expect(await screen.findByText("Nova tentativa criada: Resumo f")).toBeInTheDocument();
  });

  it("when a failed job is not retryable, should not show the retry button", async () => {
    setup([makeJob("f", "failed")]);

    await screen.findByText("Resumo f");

    expect(screen.queryByRole("button", { name: /Tentar de novo/ })).not.toBeInTheDocument();
  });

  it("when the retry is refused, should show the reason", async () => {
    const user = userEvent.setup();
    setup([makeJob("f", "failed", { retryable: true })], {
      [IpcChannels.jobs.retry]: () => failure("VALIDATION", "Este job é antigo"),
    });

    await user.click(await screen.findByRole("button", { name: /Tentar de novo/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este job é antigo");
  });

  it("when jobs are deleted, should offer to undo and bring them back", async () => {
    const user = userEvent.setup();
    const invoke = setup([makeJob("d", "completed")], {
      [IpcChannels.jobs.delete]: () => ok({ deleted: ["d"], skipped: [] }),
      [IpcChannels.jobs.undoDelete]: () => ok({ restored: ["d"] }),
    });

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Excluir selecionados/ }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    await user.click(await screen.findByRole("button", { name: "Desfazer" }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.jobs.undoDelete)).toHaveLength(1));
    expect(await screen.findByText("1 processo restaurado")).toBeInTheDocument();
  });

  it("when nothing was deleted, should not offer to undo", async () => {
    const user = userEvent.setup();
    setup([makeJob("d", "completed")], {
      [IpcChannels.jobs.deleteAll]: () => ok({ deleted: [], skipped: [{ id: "x", reason: "ACTIVE" }] }),
    });

    await user.click(await screen.findByRole("button", { name: "Excluir todos" }));
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    await screen.findByText(/não foi excluído/);
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
  });
});
