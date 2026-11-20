import { useMemo, useRef, useState } from 'react';
import { LayoutPanelTop, Shapes } from 'lucide-react';

import { InfographicPiece } from '#components/InfographicPiece';
import { InfographicView } from '#components/InfographicView';
import { OptionToggle, type ToggleOption } from '#components/OptionToggle';
import { SearchInput } from '#components/SearchInput';
import { INFOGRAPHIC_SAMPLE, INFOGRAPHIC_SAMPLE_LAYOUTS } from '#lib/infographic-sample';
import { Button } from '#ui/button';
import { layoutInfo } from '#shared/infographic-layouts';
import { INFOGRAPHIC_PIECES, INFOGRAPHIC_THEMES } from '#shared/infographic-pieces';

import { Strings } from '../strings';

const text = Strings.infographic;

type Tab = 'layouts' | 'pieces';

const TABS: readonly ToggleOption<Tab>[] = [
  { id: 'layouts', label: text.tabLayouts, icon: LayoutPanelTop },
  { id: 'pieces', label: text.tabPieces, icon: Shapes },
];

/** Sem acento e em minúsculas, para a busca achar "calculadora" ao digitar "Cálculadora". */
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Os modelos do infográfico, um a um, em um exemplo completo (a mesma tela do resumo). */
function LayoutsGallery() {
  const sample = useRef<HTMLDivElement>(null);

  const goTo = (index: number) => {
    const sections = sample.current?.querySelectorAll('section[aria-label]');

    sections?.[index]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{text.layoutsHint}</p>

      <div role="group" aria-label={text.layoutsIndex} className="flex flex-wrap gap-1.5">
        {INFOGRAPHIC_SAMPLE_LAYOUTS.map((id, index) => (
          <Button key={id} type="button" size="xs" variant="outline" onClick={() => goTo(index)}>
            {layoutInfo(id).label}
          </Button>
        ))}
      </div>

      <div ref={sample} className="mx-auto w-full max-w-[50rem]">
        <InfographicView data={INFOGRAPHIC_SAMPLE} />
      </div>
    </div>
  );
}

/** O banco de peças, por tema, com a chave que a IA usa e as palavras-chave de cada um. */
function PiecesGallery() {
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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{text.piecesHint}</p>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={text.search}
          className="w-full max-w-xs"
        />

        <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {text.count(total, groups.length)}
        </span>
      </div>

      {groups.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {text.empty}
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

          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5">
            {group.pieces.map((piece) => (
              <li
                key={piece.key}
                className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-center"
              >
                <InfographicPiece pieceKey={piece.key} className="w-16" />

                <b className="text-sm leading-tight">{piece.name}</b>

                <code className="text-[10.5px] break-all text-muted-foreground">{piece.key}</code>

                <span className="text-[11px] leading-tight text-muted-foreground">
                  {piece.tags}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Galeria do infográfico (Configurações): os modelos e todas as peças, com a cor de destaque e o
 * tema do app. Fica aqui, e não no resumo, porque o resumo só monta o infográfico; esta tela serve
 * para conhecer e escolher o que a IA tem à disposição.
 */
export function InfographicGallerySection() {
  const [tab, setTab] = useState<Tab>('layouts');

  return (
    <div className="flex flex-col gap-5">
      <OptionToggle value={tab} options={TABS} onChange={setTab} label={text.tabs} showLabels />

      <div key={tab} className="animate-enter-fade">
        {tab === 'layouts' ? <LayoutsGallery /> : <PiecesGallery />}
      </div>
    </div>
  );
}
