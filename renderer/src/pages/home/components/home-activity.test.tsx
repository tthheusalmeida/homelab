import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { IpcChannels } from "#shared/channels";
import { mockApi, ok } from "#test/api-mock";

import { createWrapper } from "../../../test/utils";

import { ActivitySection, todayKey, usageToday } from "./ActivitySection";
import { QuickActions } from "./QuickActions";
import { RecentPagesSection } from "./RecentPagesSection";

const Wrapper = createWrapper();

const renderWithRouter = (ui: React.ReactNode) =>
  render(
    <Wrapper>
      <MemoryRouter>{ui}</MemoryRouter>
    </Wrapper>,
  );

const doc = (id: string, title: string, category: string[] = []) => ({
  id,
  title,
  type: "summary",
  source: "video",
  status: "published",
  category,
  tags: [],
  createdAt: "2026-03-05T10:00:00.000Z",
  updatedAt: "2026-03-05T10:00:00.000Z",
  fileName: `${id}.md`,
  preview: "",
});

describe("todayKey / usageToday", () => {
  it("when given a date, should format it as YYYY-MM-DD in the local time zone", () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("when the timeline has today, should return its requests and cost", () => {
    const now = new Date(2026, 2, 5, 12);
    const timeline = [
      { date: "2026-03-04", requests: 9, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 9 },
      { date: "2026-03-05", requests: 4, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0.5 },
    ];

    expect(usageToday(timeline, now)).toEqual({ requests: 4, cost: 0.5 });
  });

  it("when today is missing or there is no timeline, should return zeros", () => {
    expect(usageToday([], new Date(2026, 2, 5))).toEqual({ requests: 0, cost: 0 });
    expect(usageToday(undefined)).toEqual({ requests: 0, cost: 0 });
  });
});

describe("ActivitySection", () => {
  it("when there is activity, should show running tasks, inbox count and AI usage of the day", async () => {
    const today = todayKey();

    mockApi({
      [IpcChannels.jobs.list]: () =>
        ok([
          { id: "1", status: "running", name: "x", label: "A", createdAt: "", steps: [] },
          { id: "2", status: "pending", name: "x", label: "B", createdAt: "", steps: [] },
          { id: "3", status: "completed", name: "x", label: "C", createdAt: "", steps: [] },
        ]),
      [IpcChannels.library.inbox]: () => ok([doc("a", "A"), doc("b", "B"), doc("c", "C")]),
      [IpcChannels.ai.usage]: () =>
        ok({
          summary: {},
          byProvider: [],
          byModel: [],
          recentRequests: [],
          timeline: [
            { date: today, requests: 7, inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 1.5 },
          ],
        }),
    });

    renderWithRouter(<ActivitySection />);

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("em execução agora")).toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("páginas aguardando decisão")).toBeInTheDocument();
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(screen.getByText("requisições · $1.50")).toBeInTheDocument();
  });

  it("when each card is clicked, should link to its screen", async () => {
    mockApi({
      [IpcChannels.jobs.list]: () => ok([]),
      [IpcChannels.library.inbox]: () => ok([]),
      [IpcChannels.ai.usage]: () => ok({ summary: {}, byProvider: [], byModel: [], recentRequests: [], timeline: [] }),
    });

    renderWithRouter(<ActivitySection />);

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));

    expect(hrefs).toEqual(["/jobs/track", "/library/inbox", "/ai/usage"]);
  });

  it("when the inbox has one page, should use the singular", async () => {
    mockApi({
      [IpcChannels.jobs.list]: () => ok([]),
      [IpcChannels.library.inbox]: () => ok([doc("a", "A")]),
      [IpcChannels.ai.usage]: () => ok({ summary: {}, byProvider: [], byModel: [], recentRequests: [], timeline: [] }),
    });

    renderWithRouter(<ActivitySection />);

    expect(await screen.findByText("página aguardando decisão")).toBeInTheDocument();
  });
});

describe("RecentPagesSection", () => {
  it("when the library has pages, should list the 5 latest with category and link", async () => {
    mockApi({
      [IpcChannels.library.documents.list]: () =>
        ok(Array.from({ length: 7 }, (_, i) => doc(`d${i}`, `Página ${i}`, ["DevOps", "Docker"]))),
    });

    renderWithRouter(<RecentPagesSection />);

    expect(await screen.findByText("Página 0")).toBeInTheDocument();
    expect(screen.queryByText("Página 5")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/library/d0");
    expect(screen.getAllByText("DevOps / Docker")).toHaveLength(5);
  });

  it("when the library is empty, should invite the user to create content", async () => {
    mockApi({ [IpcChannels.library.documents.list]: () => ok([]) });

    renderWithRouter(<RecentPagesSection />);

    expect(await screen.findByText(/Nenhuma página na biblioteca ainda/)).toBeInTheDocument();
  });

  it("when asking the library, should only ask for published pages, most recent first", async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.list]: () => ok([]) });

    renderWithRouter(<RecentPagesSection />);
    await screen.findByText(/Nenhuma página/);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.list, {
      status: "published",
      sort: "recent",
    });
  });
});

describe("QuickActions", () => {
  it("when rendered, should link to the main actions and show their shortcuts", () => {
    renderWithRouter(<QuickActions />);

    const link = screen.getByRole("link", { name: /Nova tarefa/ });

    expect(link).toHaveAttribute("href", "/jobs/create");
    expect(link).toHaveTextContent("G T");
    expect(screen.getByRole("link", { name: /Nova página/ })).toHaveTextContent("G N");
    expect(screen.getByRole("link", { name: /Conversa/ })).toHaveTextContent("G C");
    expect(screen.getByRole("link", { name: /Caixa de entrada/ })).toHaveTextContent("G I");
  });
});
