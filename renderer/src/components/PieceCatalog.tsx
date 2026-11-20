import { useMemo, useState } from 'react';

import { InfographicPiece } from '#components/InfographicPiece';
import { LazyRender } from '#components/LazyRender';
import { SearchInput } from '#components/SearchInput';
import { createPieceMatcher } from '#lib/piece-search';
import { cn } from '#lib/utils';
import { INFOGRAPHIC_PIECES, INFOGRAPHIC_THEMES } from '#shared/infographic-pieces';

/** Textos do catálogo de peças (a galeria das Configurações e o seletor de troca usam os mesmos). */
export const CatalogStrings = {
  search: 'Buscar peça por nome, chave, palavra-chave ou sinônimo',
  count: (pieces: number, themes: number) =>
    `${pieces} peça${pieces === 1 ? '' : 's'} em ${themes} grupo${themes === 1 ? '' : 's'}`,
  empty: 'Nenhuma peça encontrada. Tente outra palavra.',
} as const;

interface PieceCatalogProps {
  /** Com isso, cada peça vira um botão que a escolhe (o seletor de troca); sem, é só para ver. */
  onPick?: (key: string) => void;
  /** A peça que está em uso (destacada na escolha). */
  selected?: string;
  /** Mostra a chave e as palavras-chave de cada peça (a galeria); desligado, só o nome (o seletor). */
  details?: boolean;
  /** Classes da linha da busca e do contador (o seletor a deixa fixa no topo ao rolar). */
  searchClassName?: string;
  className?: string;
}

/**
 * O banco de peças do infográfico por tema, com busca (sem acento, por nome, chave, palavra-chave, tema
 * ou sinônimo). Serve à galeria das Configurações (para ver) e ao seletor de troca (para escolher).
 */
export function PieceCatalog({
  onPick,
  selected,
  details = true,
  searchClassName,
  className,
}: PieceCatalogProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const matches = createPieceMatcher(query);

    return Object.entries(INFOGRAPHIC_THEMES)
      .map(([theme, label]) => ({
        theme,
        label,
        pieces: INFOGRAPHIC_PIECES.filter((piece) => piece.theme === theme && matches(piece)),
      }))
      .filter((group) => group.pieces.length > 0);
  }, [query]);

  const total = groups.reduce((sum, group) => sum + group.pieces.length, 0);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className={cn('flex flex-wrap items-center gap-3', searchClassName)}>
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
                  {/* O desenho só é montado perto da tela; a busca e a contagem usam os dados, não o desenho. */}
                  <LazyRender className="aspect-square w-16">
                    <InfographicPiece pieceKey={piece.key} className="w-16" />
                  </LazyRender>

                  {/* Duas linhas de altura fixa: todos os cartões ficam do mesmo tamanho, e nome maior que isso vira reticências (o nome inteiro fica no tooltip). */}
                  <span className="flex h-9 w-full items-center justify-center">
                    <b className="line-clamp-2 text-sm leading-tight">{piece.name}</b>
                  </span>

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
                'flex h-full w-full flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-center';

              return (
                <li key={piece.key}>
                  {onPick ? (
                    <button
                      type="button"
                      title={piece.name}
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
                    <div title={piece.name} className={box}>
                      {content}
                    </div>
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
