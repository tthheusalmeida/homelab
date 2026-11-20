import { HexMark, HighlightedTitle, PieceBox } from './common';
import type { LayoutProps } from './types';

/**
 * Mitos e verdades: pares lado a lado, o mito em vermelho e a verdade em verde. As duas cores são
 * fixas (semânticas), não a cor de destaque do app, para não se misturarem com as ações.
 */
export function MythsLayout({ data }: LayoutProps) {
  return (
    <div className="space-y-2">
      <HighlightedTitle title={data.title} />

      {data.subtitle && <p className="max-w-[60ch] text-muted-foreground">{data.subtitle}</p>}

      <div className="hidden grid-cols-[76px_1fr_1fr] gap-3 pb-1 font-mono text-[11px] font-medium tracking-widest uppercase @2xl:grid">
        <span />

        <span className="text-destructive">Mito</span>

        <span className="text-emerald-600 dark:text-emerald-400">Verdade</span>
      </div>

      <ul className="space-y-2.5">
        {data.items.map((item, index) => (
          <li
            key={index}
            className="grid items-stretch gap-2 @2xl:grid-cols-[76px_1fr_1fr] @2xl:gap-3"
          >
            <PieceBox pieceKey={item.piece} className="w-[76px]" />

            <div
              data-myth="mito"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm"
            >
              <HexMark kind="bad" />

              <span>
                <span className="mb-0.5 block font-mono text-[11px] font-medium tracking-widest text-destructive uppercase @2xl:hidden">
                  Mito
                </span>

                {item.title}
              </span>
            </div>

            <div
              data-myth="verdade"
              className="flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3 text-sm"
            >
              <HexMark kind="true" />

              <span>
                <span className="mb-0.5 block font-mono text-[11px] font-medium tracking-widest text-emerald-600 uppercase @2xl:hidden dark:text-emerald-400">
                  Verdade
                </span>

                {item.text}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
