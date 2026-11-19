import { useState } from 'react';

import type { TimedExcerpt } from '#shared/transcript';
import { ReadingSection } from '#components/ReadingSection';

import { PreviewFrame } from './PreviewFrame';
import { TranscriptView } from './TranscriptView';

const EXCERPTS: TimedExcerpt[] = [
  {
    seconds: 0,
    text: 'Bem-vindos à aula. Hoje vamos ver como a transcrição acompanha o vídeo, trecho a trecho.',
  },
  {
    seconds: 62,
    text: 'Cada trecho começa no horário em que foi falado e leva você ao ponto certo do vídeo.',
  },
  {
    seconds: 135,
    text: 'A linha do tempo ao lado mostra onde você está e deixa pular para qualquer trecho.',
  },
  { seconds: 214, text: 'No fim, o último trecho fica completo e a leitura termina.' },
];

/**
 * Miniatura da transcrição com tempo, feita com o próprio `TranscriptView` (a linha do tempo, o
 * horário e o progresso de cada trecho são os de verdade) e os ajustes de Configurações >
 * Aparência > Transcrição valendo na hora: começo dos trechos e barra de progresso.
 */
export function TranscriptPreview() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  return (
    <PreviewFrame
      label="Pré-visualização da transcrição"
      follow={
        <div
          ref={setSlot}
          data-slot="transcript-preview-rail"
          className="hidden w-44 shrink-0 md:block"
        />
      }
    >
      <ReadingSection label="Transcrição" title="Aula de exemplo">
        <TranscriptView excerpts={EXCERPTS} railSlot={slot} />
      </ReadingSection>
    </PreviewFrame>
  );
}
