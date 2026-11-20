import { forwardRef } from 'react';

import type { InfographicLayoutId } from '#shared/infographic-layouts';
import type { LibraryInfographic } from '#shared/contracts/library';

import { cn } from '#lib/utils';

import type { TextTarget } from '#lib/infographic-text-edit';

import { CycleLayout } from './infographic/CycleLayout';
import { FunnelLayout } from './infographic/FunnelLayout';
import {
  HexMark,
  HexRule,
  HighlightedTitle,
  Kicker,
  PieceBox,
  PieceEditProvider,
  SectionProvider,
  TextEditProvider,
  Txt,
  type PieceTarget,
} from './infographic/common';
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
  /**
   * Liga a edição das peças: cada peça vira um botão e clicar nela chama esta função com o lugar da
   * peça. Sem isso o infográfico só é desenhado.
   */
  onPickPiece?: (target: PieceTarget) => void;
  /**
   * Liga a edição dos textos: cada texto vira um botão e clicar nele chama esta função com o lugar
   * do texto. Sem isso os textos são só texto.
   */
  onPickText?: (target: TextTarget) => void;
}

/** Capa: assunto, título, promessa, abertura (a definição ou o gancho) e a peça que resume o tema. */
function Cover({ data }: { data: LibraryInfographic }) {
  return (
    <header className="grid items-center gap-6 @2xl:grid-cols-[1.5fr_1fr]">
      <div className="space-y-3">
        {data.kicker && (
          <Kicker>
            <Txt kind="kicker" scope="cover">
              {data.kicker}
            </Txt>
          </Kicker>
        )}

        <HighlightedTitle title={data.title} cover />

        {data.subtitle && (
          <p className="max-w-[48ch] text-lg text-muted-foreground">
            <Txt kind="subtitle" scope="cover">
              {data.subtitle}
            </Txt>
          </p>
        )}

        {data.intro && (
          <p className="max-w-[56ch] border-l-[3px] border-brand pl-3.5 text-[15px]">
            <Txt kind="intro" scope="cover">
              {data.intro}
            </Txt>
          </p>
        )}
      </div>

      <PieceBox pieceKey={data.piece} slot="cover" className="mx-auto w-full max-w-64" />
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

            <span>
              <Txt kind="takeaway" index={index} scope="cover">
                {item}
              </Txt>
            </span>
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
  function InfographicView({ data, className, onPickPiece, onPickText }, ref) {
    const total = data.sections.length;

    return (
      <PieceEditProvider value={onPickPiece ?? null}>
        <TextEditProvider value={onPickText ?? null}>
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

                  <SectionProvider value={index}>
                    <Layout data={section} />
                  </SectionProvider>
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
        </TextEditProvider>
      </PieceEditProvider>
    );
  },
);
