import type { ReactNode } from "react";

import { Tip } from "#components/Tip";
import { niceScale } from "#lib/chart-scale";
import { cn } from "#lib/utils";

export interface BarDatum {
  id: string;
  /** O rótulo embaixo da barra (ex.: a data). */
  label: string;
  value: number;
  /** O que o tooltip mostra ao passar o mouse na coluna. */
  tooltip: ReactNode;
}

interface BarChartProps {
  data: BarDatum[];
  /** Como os números do eixo vertical aparecem (ex.: `45K`). */
  formatTick: (value: number) => string;
  /** Resumo para leitores de tela (o gráfico em si é visual). */
  ariaLabel: string;
  className?: string;
}

/**
 * Gráfico de barras do app, **sem biblioteca**: grade pontilhada, eixo vertical redondo (`niceScale`),
 * barras na cor do gráfico (`--chart-1`) com a ponta arredondada e **tooltip do app** (`Tip`) em cada
 * coluna. Cresce com a largura da tela e acompanha tema claro e escuro. Base de qualquer gráfico de
 * barras novo: reutilize em vez de trazer uma biblioteca.
 */
export function BarChart({ data, formatTick, ariaLabel, className }: BarChartProps) {
  const { max, ticks } = niceScale(Math.max(0, ...data.map((item) => item.value)));

  return (
    <div role="img" aria-label={ariaLabel} className={cn("flex h-72 w-full gap-2", className)}>
      {/* eixo vertical: deixa embaixo a altura dos rótulos de data */}
      <div aria-hidden className="flex w-11 shrink-0 flex-col pb-7 text-right text-xs text-muted-foreground">
        <div className="relative flex-1">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 leading-none tabular-nums"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              data-slot="chart-grid-line"
              className="absolute inset-x-0 border-t border-dashed border-border"
              style={{ bottom: `${(tick / max) * 100}%` }}
            />
          ))}

          <ol className="absolute inset-0 flex items-stretch gap-2 px-1">
            {data.map((item) => (
              <Tip key={item.id} content={item.tooltip} side="top" follow>
                <li
                  data-slot="chart-column"
                  aria-label={`${item.label}: ${item.value}`}
                  className="relative flex min-w-0 flex-1 items-end justify-center rounded-sm hover:bg-muted/40"
                >
                  <span
                    data-slot="chart-bar"
                    className="w-3/4 max-w-24 rounded-t bg-chart-1 transition-[height] duration-700"
                    // um valor pequeno, mas maior que zero, nunca some: fica uma faixa de 2 px
                    style={{
                      height: `${(item.value / max) * 100}%`,
                      minHeight: item.value > 0 ? 2 : 0,
                    }}
                  />
                </li>
              </Tip>
            ))}
          </ol>
        </div>

        <ol aria-hidden className="flex h-7 gap-2 px-1 pt-2 text-xs text-muted-foreground">
          {data.map((item) => (
            <li key={item.id} className="min-w-0 flex-1 truncate text-center">
              {item.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
