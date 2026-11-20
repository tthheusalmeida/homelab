import { cn } from '#lib/utils';

import { HexNum, HighlightedTitle, PieceBox } from './common';
import type { LayoutProps } from './types';

/**
 * As quatro etapas em losango, no sentido horário: 1 em cima, 2 à direita, 3 embaixo e 4 à esquerda
 * (grade 3 x 3 com vão de 1,5 rem entre as células; colunas e linhas começam em 1). Cada cartão enche
 * a sua célula, então o meio da borda dele é o meio da borda da célula, e as setas ficam nas células
 * dos cantos.
 */
const CARD_CELLS = [
  '@2xl:col-start-2 @2xl:row-start-1',
  '@2xl:col-start-3 @2xl:row-start-2',
  '@2xl:col-start-2 @2xl:row-start-3',
  '@2xl:col-start-1 @2xl:row-start-2',
] as const;

/**
 * Setas dos cantos. Cada uma sai do **meio da borda** de um cartão e entra no **meio da borda** do
 * próximo, em duas peças dentro de uma faixa (`band`): um trecho reto (`line`, que ocupa o que
 * sobrar) e um **quarto de círculo de verdade** (`arc`: quadrado, com a altura da faixa e um canto
 * arredondado por inteiro). A faixa vai do cartão de origem (estendida pelo vão de 1,5 rem) até o
 * centro da célula, e a ponta (`head`, um triângulo) fica colada na borda do cartão de destino, no
 * eixo da linha:
 * - 1 → 2 (`tr`): sai da direita do cartão 1, desce e entra pelo topo do 2;
 * - 2 → 3 (`br`): sai de baixo do cartão 2, vira à esquerda e entra pela direita do 3;
 * - 3 → 4 (`bl`): sai da esquerda do cartão 3, sobe e entra por baixo do 4;
 * - 4 → 1 (`tl`): sai de cima do cartão 4, vira à direita e entra pela esquerda do 1.
 * O traço tem 3 px, então o centro dele fica 1,5 px para cada lado do centro da célula.
 */
const ARROWS = [
  {
    id: 'tr',
    cell: '@2xl:col-start-3 @2xl:row-start-1',
    band: '-left-4 right-[calc(50%_-_1.5px)] top-[calc(50%_-_1.5px)] -bottom-[5px] flex',
    line: 'self-start',
    arc: 'rounded-tr-full border-t-[3px] border-r-[3px]',
    head: '-bottom-4 left-[calc(50%_-_7px)] border-x-[7px] border-t-[11px] border-x-transparent border-t-brand',
  },
  {
    id: 'br',
    cell: '@2xl:col-start-3 @2xl:row-start-3',
    band: '-left-[5px] right-[calc(50%_-_1.5px)] -top-4 bottom-[calc(50%_-_1.5px)] flex',
    line: 'self-end',
    arc: 'rounded-br-full border-r-[3px] border-b-[3px]',
    head: 'top-[calc(50%_-_7px)] -left-4 border-y-[7px] border-r-[11px] border-y-transparent border-r-brand',
  },
  {
    id: 'bl',
    cell: '@2xl:col-start-1 @2xl:row-start-3',
    band: 'left-[calc(50%_-_1.5px)] -right-4 -top-[5px] bottom-[calc(50%_-_1.5px)] flex flex-row-reverse',
    line: 'self-end',
    arc: 'rounded-bl-full border-b-[3px] border-l-[3px]',
    head: '-top-4 left-[calc(50%_-_7px)] border-x-[7px] border-b-[11px] border-x-transparent border-b-brand',
  },
  {
    id: 'tl',
    cell: '@2xl:col-start-1 @2xl:row-start-1',
    band: 'left-[calc(50%_-_1.5px)] -right-[5px] top-[calc(50%_-_1.5px)] -bottom-4 flex flex-row-reverse',
    line: 'self-start',
    arc: 'rounded-tl-full border-t-[3px] border-l-[3px]',
    head: 'top-[calc(50%_-_7px)] -right-4 border-y-[7px] border-l-[11px] border-y-transparent border-l-brand',
  },
] as const;

/**
 * Ciclo: quatro etapas em losango, ligadas por setas curvas que saem de um cartão e entram no
 * seguinte, fechando o círculo (sem figura no meio; a observação, se houver, fica embaixo). Abaixo
 * de `@2xl` as setas somem e os cartões viram uma lista numerada.
 */
export function CycleLayout({ data }: LayoutProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <HighlightedTitle title={data.title} />

        {data.subtitle && (
          <p className="mx-auto max-w-[60ch] text-muted-foreground">{data.subtitle}</p>
        )}
      </div>

      <div className="mx-auto grid max-w-[720px] gap-4 @2xl:grid-cols-[1fr_1.1fr_1fr] @2xl:gap-6">
        {data.items.slice(0, 4).map((item, index) => (
          <div
            key={index}
            className={cn(
              'relative flex flex-col items-center gap-1.5 rounded-xl border bg-card px-3 py-3 text-center shadow-sm',
              CARD_CELLS[index],
            )}
          >
            <span className="absolute top-2 left-2">
              <HexNum n={index + 1} />
            </span>

            <PieceBox pieceKey={item.piece} slot={{ item: index }} className="w-14" />

            <h4 className="text-[15px] font-semibold tracking-tight">{item.title}</h4>

            <p className="text-[13px] text-muted-foreground">{item.text}</p>
          </div>
        ))}

        {ARROWS.map(({ id, cell, band, line, arc, head }) => (
          <div
            key={id}
            aria-hidden="true"
            data-arrow={id}
            className={cn('relative hidden min-h-24 @2xl:block', cell)}
          >
            <span data-part="band" className={cn('absolute', band)}>
              <span data-part="line" className={cn('h-[3px] flex-1 bg-brand', line)} />

              <span
                data-part="arc"
                className={cn('aspect-square h-full shrink-0 border-brand', arc)}
              />
            </span>

            <span data-part="head" className={cn('absolute size-0', head)} />
          </div>
        ))}
      </div>

      {data.note && <p className="text-center text-sm text-muted-foreground">{data.note}</p>}
    </div>
  );
}
