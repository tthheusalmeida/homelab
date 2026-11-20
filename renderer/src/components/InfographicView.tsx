import { forwardRef } from 'react';

import type { InfographicLayoutId } from '#shared/infographic-layouts';
import type { LibraryInfographic } from '#shared/contracts/library';

import { cn } from '#lib/utils';

import { CycleLayout } from './infographic/CycleLayout';
import { FunnelLayout } from './infographic/FunnelLayout';
import { HexMark, HexRule, HighlightedTitle, Kicker, PieceBox } from './infographic/common';
import { MosaicLayout } from './infographic/MosaicLayout';
import { MythsLayout } from './infographic/MythsLayout';
import { NumbersLayout } from './infographic/NumbersLayout';
import { RadialLayout } from './infographic/RadialLayout';
import { RankingLayout } from './infographic/RankingLayout';
import { StepsLayout } from './infographic/StepsLayout';
import { TimelineLayout } from './infographic/TimelineLayout';
import type { LayoutProps } from './infographic/types';
import { VersusLayout } from './infographic/VersusLayout';

const LAYOUTS: Record<InfographicLayoutId, (props: LayoutProps) => React.ReactNode> = {
  steps: StepsLayout,
  funnel: FunnelLayout,
  timeline: TimelineLayout,
  versus: VersusLayout,
  numbers: NumbersLayout,
  radial: RadialLayout,
  ranking: RankingLayout,
  cycle: CycleLayout,
  myths: MythsLayout,
  mosaic: MosaicLayout,
};

interface InfographicViewProps {
  data: LibraryInfographic;
  className?: string;
}

/** Capa: assunto, título, promessa, abertura (a definição ou o gancho) e a peça que resume o tema. */
function Cover({ data }: { data: LibraryInfographic }) {
  return (
    <header className="grid items-center gap-6 @2xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-3">
        {data.kicker && <Kicker>{data.kicker}</Kicker>}

        <HighlightedTitle title={data.title} cover />

        {data.subtitle && (
          <p className="max-w-[48ch] text-lg text-muted-foreground">{data.subtitle}</p>
        )}

        {data.intro && (
          <p className="max-w-[56ch] border-l-[3px] border-brand pl-3.5 text-[15px]">
            {data.intro}
          </p>
        )}
      </div>

      <PieceBox pieceKey={data.piece} className="mx-auto w-full max-w-64" />
    </header>
  );
}

/** Fechamento: o que lembrar, em uma lista de verificação. */
function Takeaways({ items }: { items: string[] }) {
  return (
    <footer className="space-y-3 rounded-lg border bg-background p-4 @lg:p-5">
      <Kicker>Para lembrar</Kicker>

      <ul className="grid gap-2.5 @2xl:grid-cols-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 text-sm">
            <HexMark />

            <span>{item}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}

/**
 * Desenha o infográfico como uma **história**: a capa, as seções em ordem (cada uma no seu
 * modelo) e o fechamento. É texto de verdade e peças em SVG com as cores do app, então acompanha
 * tema e cor de destaque. O quadro (`ref`) é o que a imagem PNG fotografa.
 */
export const InfographicView = forwardRef<HTMLDivElement, InfographicViewProps>(
  function InfographicView({ data, className }, ref) {
    const total = data.sections.length;

    return (
      <div
        ref={ref}
        className={cn(
          '@container space-y-10 rounded-lg border bg-card p-5 text-card-foreground sm:p-6',
          className,
        )}
      >
        <Cover data={data} />

        {data.sections.map((section, index) => {
          const Layout = LAYOUTS[section.layout];

          return (
            <section key={index} className="space-y-3" aria-label={section.title}>
              <HexRule className="my-0" />

              {total > 1 && (
                <Kicker className="text-brand-text">
                  Parte {index + 1} de {total}
                </Kicker>
              )}

              <Layout data={section} />
            </section>
          );
        })}

        {data.takeaways && data.takeaways.length > 0 && (
          <>
            <HexRule className="my-0 mb-6" />

            <Takeaways items={data.takeaways} />
          </>
        )}
      </div>
    );
  },
);
