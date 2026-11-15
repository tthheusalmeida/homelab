import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";

import { IpcChannels } from "#shared/channels";
import { failure, mockApi, ok, payloadsOf } from "#test/api-mock";

import { SnackbarProvider } from "../../../components/Snackbar";
import { createTestQueryClient } from "../../../test/utils";
import type { Job } from "../types/job.types";

import { TrackPage } from "./TrackPage";

const isActive = (job: Job) => ["pending", "running"].includes(job.status);

const makeJob = (id: string, status: Job["status"], minute: number): Job => ({
  id,
  name: "video-to-summary",
  label: `Resumo ${id}`,
  status,
  createdAt: `2026-01-01T10:${String(minute).padStart(2, "0")}:00.000Z`,
  completedAt: "",
  steps: [],
});

/** Lista mutável: o handler de exclusão tira os jobs dela, como o main faria. */
function setup(initial: Job[], options: { deleteFails?: boolean } = {}) {
  let jobs = [...initial];
  const client = createTestQueryClient();
  const invoke = mockApi({
    [IpcChannels.jobs.list]: () => ok(jobs),
    [IpcChannels.jobs.delete]: (payload) => {
      if (options.deleteFails) {
        return failure("PERSIST_FAILED", "Não foi possível gravar o histórico de processos");
      }

      const { ids } = payload as { ids: string[] };
      const active = jobs.filter((job) => ids.includes(job.id) && isActive(job));
      const removable = ids.filter(
        (id) => jobs.some((job) => job.id === id) && !active.some((job) => job.id === id),
      );

      jobs = jobs.filter((job) => !removable.includes(job.id));

      return ok({
        deleted: removable,
        skipped: active.map((job) => ({ id: job.id, reason: "ACTIVE" })),
      });
    },
    [IpcChannels.jobs.deleteAll]: () => {
      const removed = jobs.filter((job) => !isActive(job));
      const kept = jobs.filter(isActive);

      jobs = kept;

      return ok({
        deleted: removed.map((job) => job.id),
        skipped: kept.map((job) => ({ id: job.id, reason: "ACTIVE" })),
      });
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    );
  }

  render(<TrackPage />, { wrapper: Wrapper });

  return { invoke, client, setJobs: (next: Job[]) => (jobs = next) };
}

const checkboxFor = (id: string) =>
  screen.getByRole("checkbox", { name: new RegExp(`\\(${id}\\)`) });

const finishedJobs = [
  makeJob("done-1", "completed", 1),
  makeJob("done-2", "completed", 2),
  makeJob("fail-1", "failed", 3),
];

describe("TrackPage: excluir jobs", () => {
  it("when the selection mode is off, should show no checkboxes", async () => {
    setup(finishedJobs);

    await screen.findByText("Resumo done-1");

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("when entering the selection mode, should show a checkbox per job and offer to cancel", async () => {
    const user = userEvent.setup();
    setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Cancelar seleção" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Excluir selecionados (0)" })).toBeDisabled();
  });

  it("when a job is pending or running, should disable its checkbox and explain why", async () => {
    const user = userEvent.setup();
    setup([...finishedJobs, makeJob("run-1", "running", 4), makeJob("pen-1", "pending", 5)]);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));

    expect(checkboxFor("run-1")).toBeDisabled();
    expect(checkboxFor("run-1")).toHaveAttribute("title", expect.stringContaining("Em andamento"));
    expect(checkboxFor("pen-1")).toBeDisabled();
    expect(checkboxFor("done-1")).toBeEnabled();
  });

  it("when selecting two jobs and confirming, should delete exactly those, confirm with a snackbar and leave the selection mode", async () => {
    const user = userEvent.setup();
    const { invoke } = setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(checkboxFor("done-1"));
    await user.click(checkboxFor("fail-1"));
    await user.click(screen.getByRole("button", { name: "Excluir selecionados (2)" }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("2 processos serão excluídos do histórico");
    expect(dialog).toHaveTextContent("documentos gerados continuam na biblioteca");

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.jobs.delete)).toEqual([{ ids: ["done-1", "fail-1"] }]),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("2 processos excluídos");
    await waitFor(() => expect(screen.queryByText("Resumo done-1")).not.toBeInTheDocument());
    expect(screen.getByText("Resumo done-2")).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("when only one job is selected, should word the confirmation in the singular", async () => {
    const user = userEvent.setup();
    setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(checkboxFor("done-2"));
    await user.click(screen.getByRole("button", { name: "Excluir selecionados (1)" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("1 processo será excluído");
  });

  it("when choosing select all, should check only the jobs that can be deleted, and toggling again should clear them", async () => {
    const user = userEvent.setup();
    setup([...finishedJobs, makeJob("run-1", "running", 4)]);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(screen.getByRole("button", { name: "Selecionar todos" }));

    expect(checkboxFor("done-1")).toBeChecked();
    expect(checkboxFor("fail-1")).toBeChecked();
    expect(checkboxFor("run-1")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Excluir selecionados (3)" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Limpar seleção" }));

    expect(checkboxFor("done-1")).not.toBeChecked();
  });

  it("when cancelling the selection, should uncheck everything and go back to the normal toolbar", async () => {
    const user = userEvent.setup();
    setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(checkboxFor("done-1"));
    await user.click(screen.getByRole("button", { name: "Cancelar seleção" }));

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Selecionar" }));

    expect(checkboxFor("done-1")).not.toBeChecked();
  });

  it("when the list is refreshed by polling, should keep what was selected", async () => {
    const user = userEvent.setup();
    const { client } = setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(checkboxFor("done-1"));

    await act(() => client.invalidateQueries({ queryKey: ["jobs"] }));

    expect(checkboxFor("done-1")).toBeChecked();
  });

  it("when a selected job disappears from the list, should drop it from the count", async () => {
    const user = userEvent.setup();
    const { client, setJobs } = setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(checkboxFor("done-1"));
    await user.click(checkboxFor("done-2"));
    expect(screen.getByRole("button", { name: "Excluir selecionados (2)" })).toBeVisible();

    setJobs([finishedJobs[1], finishedJobs[2]]);
    await act(() => client.invalidateQueries({ queryKey: ["jobs"] }));

    expect(await screen.findByRole("button", { name: "Excluir selecionados (1)" })).toBeVisible();
  });

  it("when deleting all, should warn how many active jobs stay and call the delete-all channel", async () => {
    const user = userEvent.setup();
    const { invoke } = setup([...finishedJobs, makeJob("run-1", "running", 4)]);

    await user.click(await screen.findByRole("button", { name: "Excluir todos" }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("3 processos concluídos ou com falha serão excluídos");
    expect(dialog).toHaveTextContent("1 processo em andamento permanece");

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.jobs.deleteAll)).toHaveLength(1));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "3 processos excluídos. 1 em andamento não foi excluído.",
    );
    expect(await screen.findByText("Resumo run-1")).toBeVisible();
    await waitFor(() => expect(screen.queryByText("Resumo done-1")).not.toBeInTheDocument());
  });

  it("when every job is still active, should disable delete all and say why", async () => {
    setup([makeJob("run-1", "running", 1), makeJob("pen-1", "pending", 2)]);

    const button = await screen.findByRole("button", { name: "Excluir todos" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", expect.stringContaining("Não há processos"));
  });

  it("when there are no jobs, should show no selection or delete buttons", async () => {
    setup([]);

    await screen.findByText("Tarefas");

    expect(screen.queryByRole("button", { name: "Selecionar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir todos" })).not.toBeInTheDocument();
  });

  it("when the confirmation is cancelled, should delete nothing", async () => {
    const user = userEvent.setup();
    const { invoke } = setup(finishedJobs);

    await user.click(await screen.findByRole("button", { name: "Excluir todos" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(payloadsOf(invoke, IpcChannels.jobs.deleteAll)).toEqual([]);
    expect(screen.getByText("Resumo done-1")).toBeVisible();
  });

  it("when deleting fails, should show the error in the dialog and keep the jobs and the selection", async () => {
    const user = userEvent.setup();
    setup(finishedJobs, { deleteFails: true });

    await user.click(await screen.findByRole("button", { name: "Selecionar" }));
    await user.click(checkboxFor("done-1"));
    await user.click(screen.getByRole("button", { name: "Excluir selecionados (1)" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível gravar o histórico",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Resumo done-1")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
