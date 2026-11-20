import { useMemo, useState } from 'react';

import { InfographicPiece } from '#components/InfographicPiece';
import { SearchInput } from '#components/SearchInput';
import { cn } from '#lib/utils';
import { INFOGRAPHIC_PIECES, INFOGRAPHIC_THEMES } from '#shared/infographic-pieces';

/** Textos do catálogo de peças (a galeria das Configurações e o seletor de troca usam os mesmos). */
export const CatalogStrings = {
  search: 'Buscar peça por nome, chave ou palavra-chave',
  count: (pieces: number, themes: number) =>
    `${pieces} peça${pieces === 1 ? '' : 's'} em ${themes} grupo${themes === 1 ? '' : 's'}`,
  empty: 'Nenhuma peça encontrada. Tente outra palavra.',
} as const;

/** Sem acento e em minúsculas, para a busca achar "calculadora" ao digitar "Cálculadora". */
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface PieceCatalogProps {
  /** Com isso, cada peça vira um botão que a escolhe (o seletor de troca); sem, é só para ver. */
  onPick?: (key: string) => void;
  /** A peça que está em uso (destacada na escolha). */
  selected?: string;
  /** Mostra a chave e as palavras-chave de cada peça (a galeria); desligado, só o nome (o seletor). */
  details?: boolean;
  className?: string;
}

/**
 * O banco de peças do infográfico por tema, com busca (sem acento, por nome, chave, palavra-chave ou
 * tema). Serve à galeria das Configurações (para ver) e ao seletor de troca (para escolher).
 */
export function PieceCatalog({ onPick, selected, details = true, className }: PieceCatalogProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = normalize(query.trim());

    return Object.entries(INFOGRAPHIC_THEMES)
      .map(([theme, label]) => ({
        theme,
        label,
        pieces: INFOGRAPHIC_PIECES.filter(
          (piece) =>
            piece.theme === theme &&
            (needle === '' ||
              normalize(`${piece.name} ${piece.key} ${piece.tags} ${label}`).includes(needle)),
        ),
      }))
      .filter((group) => group.pieces.length > 0);
  }, [query]);

  const total = groups.reduce((sum, group) => sum + group.pieces.length, 0);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={CatalogStrings.search}
          className="w-full max-w-sm"
        />

        <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {CatalogStrings.count(total, groups.length)}
        </span>
      </div>

      {groups.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {CatalogStrings.empty}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.theme} aria-label={group.label} className="flex flex-col gap-2.5">
          <h3 className="flex items-baseline gap-2 text-sm font-semibold">
            {group.label}
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {group.pieces.length}
            </span>
          </h3>

          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2.5">
            {group.pieces.map((piece) => {
              const content = (
                <>
                  <InfographicPiece pieceKey={piece.key} className="w-16" />

                  <b className="text-sm leading-tight">{piece.name}</b>

                  {details && (
                    <>
                      <code className="text-[10.5px] break-all text-muted-foreground">
                        {piece.key}
                      </code>

                      <span className="text-[11px] leading-tight text-muted-foreground">
                        {piece.tags}
                      </span>
                    </>
                  )}
                </>
              );
              const box =
                'flex w-full flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-center';

              return (
                <li key={piece.key}>
                  {onPick ? (
                    <button
                      type="button"
                      aria-pressed={piece.key === selected}
                      onClick={() => onPick(piece.key)}
                      className={cn(
                        box,
                        'cursor-pointer transition hover:border-brand focus-visible:outline-2 focus-visible:outline-brand',
                        piece.key === selected && 'border-brand ring-2 ring-brand',
                      )}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={box}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
