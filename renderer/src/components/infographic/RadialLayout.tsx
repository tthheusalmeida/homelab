import { Kicker, PieceBox, Txt } from './common';

import type { LayoutProps } from './types';

/** Posição (em % da área) de cada faceta, em volta do centro, a partir do topo e no sentido horário. */
export function radialPositions(count: number): Array<[number, number]> {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;

    return [Math.round(50 + 36 * Math.cos(angle)), Math.round(50 + 37 * Math.sin(angle))];
  });
}

/**
 * Mapa de conceitos: o tema no centro e as facetas em volta, ligadas por linhas tracejadas. Em
 * área estreita vira uma grade de duas colunas, sem as linhas.
 */
export function RadialLayout({ data }: LayoutProps) {
  const positions = radialPositions(data.items.length);

  return (
    <div className="space-y-2">
      <div className="relative mx-auto grid max-w-[780px] grid-cols-2 gap-4 @2xl:mt-8 @2xl:block @2xl:aspect-[1/.95]">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 hidden size-full @2xl:block"
        >
          {positions.map(([x, y], index) => (
            <line
              key={index}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth="2"
              strokeDasharray="5 5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <div className="col-span-2 mx-auto w-[min(14rem,70%)] text-center @2xl:absolute @2xl:top-1/2 @2xl:left-1/2 @2xl:w-[24%] @2xl:-translate-x-1/2 @2xl:-translate-y-1/2">
          <div className="rounded-full border border-brand bg-background bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1.2px)] bg-[length:14px_14px]">
            <PieceBox pieceKey={data.piece} slot="section" />
          </div>

          <h3 className="mt-1 text-[clamp(0.9rem,2.4vw,1.25rem)] leading-tight font-extrabold tracking-tight">
            <Txt kind="title">{data.title}</Txt>
          </h3>
        </div>

        {data.items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-0.5 text-center @2xl:absolute @2xl:w-[19%] @2xl:-translate-x-1/2 @2xl:-translate-y-1/2"
            style={{ left: `${positions[index][0]}%`, top: `${positions[index][1]}%` }}
          >
            <PieceBox pieceKey={item.piece} slot={{ item: index }} />

            <h4 className="text-sm font-semibold tracking-tight">
              <Txt kind="item.title" index={index}>
                {item.title}
              </Txt>
            </h4>

            <span className="text-xs leading-snug text-muted-foreground">
              <Txt kind="item.text" index={index}>
                {item.text}
              </Txt>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
