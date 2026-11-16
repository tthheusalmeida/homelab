import type { CSSProperties } from "react";
import { Link } from "react-router";

import { formatNumber } from "#lib/format";

import { useAiUsage } from "../../ai/usage/hooks/useAiUsage";
import type { AiUsageTimeline } from "../../ai/usage/types/aiUsage.types";
import { useInbox } from "../../library/hooks/useLibrary";
import { useActiveJobsCount } from "../../jobs/track/hooks/useActiveJobsCount";

import { OverviewCard, type OverviewCardProps } from "./OverviewCard";

/** Data de hoje no fuso do usuário, no formato `AAAA-MM-DD` (o mesmo das datas do consumo). */
export function todayKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

/** Requisições e custo estimado de hoje (zeros quando ainda não houve nenhuma). */
export function usageToday(timeline: AiUsageTimeline[] | undefined, now: Date = new Date()) {
  const today = todayKey(now);
  const entry = timeline?.find((item) => item.date.startsWith(today));

  return { requests: entry?.requests ?? 0, cost: entry?.estimatedCost ?? 0 };
}

const formatCost = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * O que está acontecendo agora no homelab: tarefas rodando, páginas esperando na caixa de entrada
 * e o consumo de IA do dia. Cada cartão leva à tela correspondente.
 */
export function ActivitySection() {
  const activeJobs = useActiveJobsCount();
  const inbox = useInbox();
  const usage = useAiUsage();
  const today = usageToday(usage.data?.timeline);
  const pending = inbox.data?.length ?? 0;

  const cards: (OverviewCardProps & { to: string })[] = [
    {
      to: "/jobs/track",
      label: "Tarefas",
      value: activeJobs,
      description: "em execução agora",
    },
    {
      to: "/library/inbox",
      label: "Caixa de entrada",
      value: pending,
      description: pending === 1 ? "página aguardando decisão" : "páginas aguardando decisão",
    },
    {
      to: "/ai/usage",
      label: "IA hoje",
      value: formatNumber(today.requests),
      description: `${today.requests === 1 ? "requisição" : "requisições"} · ${formatCost(today.cost)}`,
    },
  ];

  return (
    <section aria-label="Atividade" className="grid gap-2 sm:grid-cols-3">
      {cards.map(({ to, ...card }, index) => (
        <Link
          key={to}
          to={to}
          className="animate-enter block rounded-lg transition-[box-shadow] duration-200 hover:ring-3 hover:ring-primary/15 [&>*]:h-full"
          style={{ "--i": index } as CSSProperties}
        >
          <OverviewCard {...card} />
        </Link>
      ))}
    </section>
  );
}
