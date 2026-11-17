import { Minus, Plus, ZoomIn, ZoomOut } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '#ui/card';

import { ValueStepper } from './ValueStepper';
import { useReadingPreferences } from '#hooks/use-appearance';
import { stepFontSize, stepZoom } from '#lib/reading';
import {
  READING_FONT_SIZE,
  READING_ZOOM,
  type ReadingPreferences,
} from '#shared/contracts/reading';

/**
 * Atalhos de leitura (tamanho da letra e zoom) para o painel ao lado do sumário, na página, no livro
 * e no modo leitura. São os mesmos valores de Configurações > Aparência > Leitura: mudar aqui muda lá.
 * O zoom alarga ou estreita a coluna do texto sem mexer no tamanho da letra.
 */
export function ReadingQuickControls() {
  const { reading, updateReading } = useReadingPreferences();

  const change = (patch: Partial<ReadingPreferences>) => {
    // Se a gravação falhar, o provedor volta ao valor anterior; não há o que avisar aqui.
    updateReading?.(patch).catch(() => undefined);
  };

  return (
    <Card aria-label="Ajustes de leitura" className="sidebar-card gap-2 py-3">
      <CardHeader>
        <CardTitle className="text-sm">Leitura</CardTitle>
      </CardHeader>

      <CardContent className="gap-2">
        <ValueStepper
          label="Letra"
          value={`${reading.fontSize}`}
          decreaseLabel="Diminuir a letra"
          increaseLabel="Aumentar a letra"
          canDecrease={reading.fontSize > READING_FONT_SIZE.min}
          canIncrease={reading.fontSize < READING_FONT_SIZE.max}
          decreaseIcon={<Minus />}
          increaseIcon={<Plus />}
          onDecrease={() => change({ fontSize: stepFontSize(reading.fontSize, -1) })}
          onIncrease={() => change({ fontSize: stepFontSize(reading.fontSize, 1) })}
        />

        <ValueStepper
          label="Zoom"
          value={`${reading.zoom}%`}
          decreaseLabel="Diminuir o zoom"
          increaseLabel="Aumentar o zoom"
          canDecrease={reading.zoom > READING_ZOOM.min}
          canIncrease={reading.zoom < READING_ZOOM.max}
          decreaseIcon={<ZoomOut />}
          increaseIcon={<ZoomIn />}
          onDecrease={() => change({ zoom: stepZoom(reading.zoom, -1) })}
          onIncrease={() => change({ zoom: stepZoom(reading.zoom, 1) })}
        />
      </CardContent>
    </Card>
  );
}
