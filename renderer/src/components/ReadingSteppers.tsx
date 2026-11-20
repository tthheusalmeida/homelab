import { Minus, Plus, ZoomIn, ZoomOut } from 'lucide-react';

import { Tip } from '#components/Tip';
import { ValueStepper } from '#components/ValueStepper';
import { stepFontSize, stepZoom } from '#lib/reading';
import {
  READING_FONT_SIZE,
  READING_ZOOM,
  type ReadingPreferences,
} from '#shared/contracts/reading';

interface ReadingSteppersProps {
  reading: ReadingPreferences;
  change: (patch: Partial<ReadingPreferences>) => void;
  /** Rótulos dos dois controles (ex.: "Letra" e "Zoom"). */
  fontLabel: string;
  zoomLabel: string;
  /** Explicação do zoom, em tooltip (some quando não há). */
  zoomHint?: string;
}

/**
 * Os dois ajustes de leitura (tamanho da letra e zoom da coluna) com os passos e limites de sempre.
 * É a mesma peça de Configurações > Aparência > Leitura e do painel de leitura da página, do livro e
 * do modo leitura: o chamador só diz onde ficam (o container) e como gravar (`change`).
 */
export function ReadingSteppers({
  reading,
  change,
  fontLabel,
  zoomLabel,
  zoomHint,
}: ReadingSteppersProps) {
  const zoom = (
    <ValueStepper
      label={zoomLabel}
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
  );

  return (
    <>
      <ValueStepper
        label={fontLabel}
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

      {zoomHint ? (
        <Tip content={zoomHint}>
          <span>{zoom}</span>
        </Tip>
      ) : (
        zoom
      )}
    </>
  );
}
