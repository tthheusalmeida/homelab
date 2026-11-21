import { useRef, useState } from 'react';
import { LayoutPanelTop, Shapes } from 'lucide-react';

import { InfographicView } from '#components/InfographicView';
import { OptionToggle, type ToggleOption } from '#components/OptionToggle';
import { PieceCatalog } from '#components/PieceCatalog';
import { SettingsStack } from '#components/SettingsGroup';
import { INFOGRAPHIC_SAMPLE, INFOGRAPHIC_SAMPLE_LAYOUTS } from '#lib/infographic-sample';
import { Button } from '#ui/button';
import { layoutInfo } from '#shared/infographic-layouts';

import { Strings } from '../strings';

const text = Strings.infographic;

type Tab = 'layouts' | 'pieces';

const TABS: readonly ToggleOption<Tab>[] = [
  { id: 'layouts', label: text.tabLayouts, icon: LayoutPanelTop },
  { id: 'pieces', label: text.tabPieces, icon: Shapes },
];

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
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{text.piecesHint}</p>

      <PieceCatalog />
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
    <SettingsStack>
      <OptionToggle value={tab} options={TABS} onChange={setTab} label={text.tabs} showLabels />

      <div key={tab} className="animate-enter-fade">
        {tab === 'layouts' ? <LayoutsGallery /> : <PiecesGallery />}
      </div>
    </SettingsStack>
  );
}
