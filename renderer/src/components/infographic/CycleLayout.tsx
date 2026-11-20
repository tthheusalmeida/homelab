import { cn } from '#lib/utils';

import { HighlightedTitle, Kicker, PieceBox } from './common';
import type { LayoutProps } from './types';

/**
 * As quatro etapas em losango, no sentido horário: 1 em cima, 2 à direita, 3 embaixo e 4 à esquerda
 * (grade 3 x 3; colunas e linhas começam em 1). Cada cartão enche a sua célula, então o centro dele
 * é o centro da célula, e as setas ficam nas células dos cantos, entre dois cartões vizinhos.
 */
const CARD_CELLS = [
  '@2xl:col-start-2 @2xl:row-start-1',
  '@2xl:col-start-3 @2xl:row-start-2',
  '@2xl:col-start-2 @2xl:row-start-3',
  '@2xl:col-start-1 @2xl:row-start-2',
] as const;

const LINE = 'border-brand';

/**
 * Setas dos cantos. Cada uma sai do **meio da borda** de um cartão e entra no **meio da borda** do
 * próximo, com uma curva de 90° arredondada, feita só com as bordas de uma caixa (a caixa ocupa o
 * quarto da célula entre os dois pontos), então base e ponta ficam alinhadas em qualquer tamanho:
 * - 1 → 2 (canto de cima à direita): sai da direita do cartão 1, desce e entra pelo topo do 2;
 * - 2 → 3 (canto de baixo à direita): sai de baixo do cartão 2, vira à esquerda e entra pela direita do 3;
 * - 3 → 4 (canto de baixo à esquerda): sai da esquerda do cartão 3, sobe e entra por baixo do 4;
 * - 4 → 1 (canto de cima à esquerda): sai de cima do cartão 4, vira à direita e entra pela esquerda do 1.
 * O pequeno afastamento (`1` = 4 px) das duas pontas deixa um respiro entre a seta e o cartão.
 */
const ARROWS = [
  {
    id: 'tr',
    cell: '@2xl:col-start-3 @2xl:row-start-1',
    line: 'top-1/2 right-1/2 bottom-1 left-1 rounded-tr-[28px] border-t-[3px] border-r-[3px]',
    head: 'right-[1.5px] bottom-px translate-x-1/2 border-r-[3px] border-b-[3px]',
  },
  {
    id: 'br',
    cell: '@2xl:col-start-3 @2xl:row-start-3',
    line: 'top-1 right-1/2 bottom-1/2 left-1 rounded-br-[28px] border-r-[3px] border-b-[3px]',
    head: 'bottom-[1.5px] left-px translate-y-1/2 border-b-[3px] border-l-[3px]',
  },
  {
    id: 'bl',
    cell: '@2xl:col-start-1 @2xl:row-start-3',
    line: 'top-1 right-1 bottom-1/2 left-1/2 rounded-bl-[28px] border-b-[3px] border-l-[3px]',
    head: 'top-px left-[1.5px] -translate-x-1/2 border-t-[3px] border-l-[3px]',
  },
  {
    id: 'tl',
    cell: '@2xl:col-start-1 @2xl:row-start-1',
    line: 'top-1/2 right-1 bottom-1 left-1/2 rounded-tl-[28px] border-t-[3px] border-l-[3px]',
    head: 'top-[1.5px] right-px -translate-y-1/2 border-t-[3px] border-r-[3px]',
  },
] as const;

/**
 * Ciclo: quatro etapas em losango, ligadas por setas curvas de 90° que saem de um cartão e entram
 * no seguinte, fechando o círculo (sem figura no meio; a observação, se houver, fica embaixo).
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

      <div className="mx-auto grid max-w-[820px] gap-3 @2xl:grid-cols-[1fr_1.15fr_1fr] @2xl:gap-0">
        {data.items.slice(0, 4).map((item, index) => (
          <div
            key={index}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border bg-background p-3 text-center',
              CARD_CELLS[index],
            )}
          >
            <PieceBox pieceKey={item.piece} className="w-20" />

            <Kicker className="text-brand-text">{index + 1}</Kicker>

            <h4 className="font-semibold tracking-tight">{item.title}</h4>

            <p className="text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}

        {ARROWS.map(({ id, cell, line, head }) => (
          <div
            key={id}
            aria-hidden="true"
            data-arrow={id}
            className={cn('relative hidden min-h-12 @2xl:block', cell)}
          >
            <span className={cn('absolute', LINE, line)}>
              <i className={cn('absolute size-2.5 rotate-45 not-italic', LINE, head)} />
            </span>
          </div>
        ))}
      </div>

      {data.note && <p className="text-center text-sm text-muted-foreground">{data.note}</p>}
    </div>
  );
}
