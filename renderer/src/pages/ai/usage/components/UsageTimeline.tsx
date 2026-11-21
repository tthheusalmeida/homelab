import { Card, CardContent, CardHeader, CardTitle } from "../../../../ui/card";
import { BarChart } from "#components/BarChart";

import type { AiUsageTimeline } from "../types/aiUsage.types";

import { formatDate, formatNumber } from "#lib/format";

interface UsageTimelineProps {
  data: AiUsageTimeline[];
}

export function getLastSevenDays(): string[] {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);

    date.setDate(today.getDate() - (6 - index));

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  });
}

function createTimeline(data: AiUsageTimeline[]): AiUsageTimeline[] {
  return getLastSevenDays().map(
    (date) =>
      data.find((item) => item.date === date) ?? {
        date,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
  );
}

/** O que o tooltip de uma barra mostra: a data e os tokens do dia. */
function DayTooltip({ day }: { day: AiUsageTimeline }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-medium">{formatDate(day.date)}</span>

      <span className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-xs bg-chart-1" />

        <span className="opacity-80">Tokens:</span>

        <span className="font-mono font-medium tabular-nums">
          {formatNumber(day.totalTokens)}
        </span>
      </span>
    </span>
  );
}

export function UsageTimeline({ data }: UsageTimelineProps) {
  const timeline = createTimeline(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consumo de tokens</CardTitle>
      </CardHeader>

      <CardContent>
        <BarChart
          ariaLabel="Consumo de tokens nos últimos 7 dias"
          formatTick={formatNumber}
          data={timeline.map((day) => ({
            id: day.date,
            label: formatDate(day.date),
            value: day.totalTokens,
            tooltip: <DayTooltip day={day} />,
          }))}
        />
      </CardContent>
    </Card>
  );
}
