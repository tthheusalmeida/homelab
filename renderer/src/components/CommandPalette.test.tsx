import { describe, expect, it } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";

import { IpcChannels } from "#shared/channels";
import { mockApi, ok, payloadsOf } from "#test/api-mock";

import { createWrapper } from "../test/utils";

import { CommandPalette } from "./CommandPalette";

function Probe() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function Harness() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <CommandPalette open={open} onOpenChange={setOpen} />
      <Probe />
      <p>{open ? "aberta" : "fechada"}</p>
    </>
  );
}

const Wrapper = createWrapper();

function setup(documents: unknown[] = []) {
  const invoke = mockApi({
    [IpcChannels.library.documents.list]: () => ok(documents),
  });

  render(
    <Wrapper>
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    </Wrapper>,
  );

  return invoke;
}

const doc = (id: string, title: string) => ({
  id,
  title,
  type: "summary",
  source: "video",
  status: "published",
  category: ["DevOps", "Docker"],
  tags: [],
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  fileName: `${id}.md`,
  preview: "",
});

describe("CommandPalette", () => {
  it("when opened, should list every screen with its shortcut", async () => {
    setup();

    expect(await screen.findByRole("option", { name: /Nova tarefa/ })).toHaveTextContent("G T");
    expect(screen.getByRole("option", { name: /Início/ })).toHaveTextContent("G H");
    expect(screen.getAllByRole("option").length).toBeGreaterThanOrEqual(9);
  });

  it("when typing, should filter screens ignoring accents and case", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByRole("combobox"), "inicio");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: /Início/ })).toBeInTheDocument();
  });

  it("when Enter is pressed, should open the selected screen and close", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(await screen.findByRole("combobox"), "em andamento{Enter}");

    expect(screen.getByTestId("path")).toHaveTextContent("/jobs/track");
    expect(screen.getByText("fechada")).toBeInTheDocument();
  });

  it("when the arrows are used, should move the selection", async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByRole("combobox");

    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}{ArrowDown}");

    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");

    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("when a text with 2 letters or more is typed, should also search library pages", async () => {
    const user = userEvent.setup();
    const invoke = setup([doc("d1", "Docker na prática")]);

    await user.type(await screen.findByRole("combobox"), "docker");

    expect(await screen.findByRole("option", { name: /Docker na prática/ })).toHaveTextContent(
      "DevOps / Docker",
    );
    expect(payloadsOf(invoke, IpcChannels.library.documents.list).at(-1)).toMatchObject({
      q: "docker",
    });
  });

  it("when a page is chosen, should open that page", async () => {
    const user = userEvent.setup();
    setup([doc("d1", "Docker na prática")]);

    await user.type(await screen.findByRole("combobox"), "docker");
    await user.click(await screen.findByRole("option", { name: /Docker na prática/ }));

    expect(screen.getByTestId("path")).toHaveTextContent("/library/d1");
  });

  it("when only one letter is typed, should not search the library", async () => {
    const user = userEvent.setup();
    const invoke = setup([doc("d1", "Docker")]);

    await user.type(await screen.findByRole("combobox"), "d");
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(payloadsOf(invoke, IpcChannels.library.documents.list)).toEqual([]);
  });

  it("when nothing matches, should say so", async () => {
    const user = userEvent.setup();
    setup([]);

    await user.type(await screen.findByRole("combobox"), "zzzzqq");

    await waitFor(() => expect(screen.getByText("Nada encontrado.")).toBeInTheDocument());
  });

  it("when closed and reopened, should clear the previous text", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(await screen.findByRole("combobox"), "livros{Escape}");

    await waitFor(() => expect(screen.getByText("fechada")).toBeInTheDocument());
  });
});
