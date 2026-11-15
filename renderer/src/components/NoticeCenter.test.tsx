import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IpcChannels } from "#shared/channels";
import type { AppNotice } from "#shared/contracts/events";
import { IpcEvents } from "#shared/events";
import { emitEvent, failure, listenerCount, mockApi, ok } from "#test/api-mock";

import { INFO_NOTICE_MS, NoticeCenter } from "./NoticeCenter";

const jobFailed: AppNotice = {
  id: "job:1",
  level: "error",
  title: "Resumo de vídeo falhou",
  message: "Abra a lista de tarefas para ver em qual etapa parou.",
  detail: "Whisper CLI não encontrado: C:/x/whisper-cli.exe",
  link: { label: "Ver tarefas", path: "/jobs/track" },
};

const done: AppNotice = {
  id: "job:2",
  level: "info",
  title: "Transcrição de vídeo concluído",
};

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>;
}

function setup(pending: AppNotice[] = [], route = "/") {
  mockApi({ [IpcChannels.notices.pending]: () => ok(pending) });

  return render(
    <MemoryRouter initialEntries={[route]}>
      <NoticeCenter />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NoticeCenter", () => {
  afterEach(() => vi.useRealTimers());

  it("when there are no notices, should render nothing", async () => {
    setup();

    await waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));
    expect(screen.queryByRole("region", { name: "Avisos" })).not.toBeInTheDocument();
  });

  it("when notices were born before the screen existed, should fetch and show them on mount", async () => {
    setup([jobFailed, { ...done, id: "startup" }]);

    expect(await screen.findByText("Resumo de vídeo falhou")).toBeVisible();
    expect(screen.getByText("Transcrição de vídeo concluído")).toBeVisible();
  });

  it("when a notice arrives by event, should show it, with the error as an alert", async () => {
    setup();
    await waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, jobFailed));

    expect(await screen.findByRole("alert")).toHaveTextContent("Resumo de vídeo falhou");
    expect(screen.getByText(/lista de tarefas/)).toBeVisible();
  });

  it("when a notice with the same id arrives again, should replace it instead of stacking", async () => {
    setup();
    await waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, { ...jobFailed, title: "Primeira falha" }));
    act(() => emitEvent(IpcEvents.notice, { ...jobFailed, title: "Segunda falha" }));

    expect(await screen.findByText("Segunda falha")).toBeVisible();
    expect(screen.queryByText("Primeira falha")).not.toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("when the notice has details, should hide them until the user asks and then hide them again", async () => {
    const user = userEvent.setup();

    setup([jobFailed]);
    await screen.findByText("Resumo de vídeo falhou");

    expect(screen.queryByText(/whisper-cli\.exe/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver detalhes" }));
    expect(screen.getByText(/whisper-cli\.exe/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Ocultar detalhes" }));
    expect(screen.queryByText(/whisper-cli\.exe/)).not.toBeInTheDocument();
  });

  it("when the notice has no details, should not offer to show them", async () => {
    setup([done]);
    await screen.findByText("Transcrição de vídeo concluído");

    expect(screen.queryByRole("button", { name: "Ver detalhes" })).not.toBeInTheDocument();
  });

  it("when the dismiss button is clicked, should remove only that notice", async () => {
    const user = userEvent.setup();

    setup([jobFailed, { ...done, id: "outro" }]);
    await screen.findByText("Resumo de vídeo falhou");

    await user.click(screen.getAllByRole("button", { name: "Dispensar aviso" })[0]);

    expect(screen.queryByText("Resumo de vídeo falhou")).not.toBeInTheDocument();
    expect(screen.getByText("Transcrição de vídeo concluído")).toBeVisible();
  });

  it("when the link button is clicked, should go to that screen and dismiss the notice", async () => {
    const user = userEvent.setup();

    setup([jobFailed]);
    await user.click(await screen.findByRole("button", { name: "Ver tarefas" }));

    expect(screen.getByTestId("where")).toHaveTextContent("/jobs/track");
    expect(screen.queryByText("Resumo de vídeo falhou")).not.toBeInTheDocument();
  });

  it("when the user is already on the screen the notice points to, should still show it (jobs finish while looking at the tasks)", async () => {
    setup([], "/jobs/track");
    await waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, { ...jobFailed, id: "job:9" }));

    expect(await screen.findByText("Resumo de vídeo falhou")).toBeVisible();
    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("when a job finishes with success on the tasks screen, should show the info notice and then let it fade", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup([], "/jobs/track");
    await vi.waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, { ...done, link: { label: "Ver tarefas", path: "/jobs/track" } }));
    expect(screen.getByText("Transcrição de vídeo concluído")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_MS + 100);
    });

    expect(screen.queryByText("Transcrição de vídeo concluído")).not.toBeInTheDocument();
  });

  it("when an info notice is shown, should disappear by itself after a while", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup();
    await vi.waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, done));
    expect(screen.getByText("Transcrição de vídeo concluído")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_MS + 100);
    });

    expect(screen.queryByText("Transcrição de vídeo concluído")).not.toBeInTheDocument();
  });

  it("when an error notice is shown, should stay until dismissed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup();
    await vi.waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, jobFailed));
    act(() => {
      vi.advanceTimersByTime(INFO_NOTICE_MS * 5);
    });

    expect(screen.getByText("Resumo de vídeo falhou")).toBeVisible();
  });

  it("when fetching the pending notices fails, should keep working and still show the new ones", async () => {
    mockApi({ [IpcChannels.notices.pending]: () => failure("INTERNAL", "sem main") });
    render(
      <MemoryRouter>
        <NoticeCenter />
      </MemoryRouter>,
    );
    await waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));

    act(() => emitEvent(IpcEvents.notice, jobFailed));

    expect(await screen.findByText("Resumo de vídeo falhou")).toBeVisible();
  });

  it("when the component unmounts, should stop listening", async () => {
    const { unmount } = setup();

    await waitFor(() => expect(listenerCount(IpcEvents.notice)).toBe(1));
    unmount();

    expect(listenerCount(IpcEvents.notice)).toBe(0);
  });
});
