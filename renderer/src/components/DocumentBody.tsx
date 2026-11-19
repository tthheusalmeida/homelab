import { useMemo } from 'react';

import { parseTimedTranscript } from '#shared/transcript';

import { MarkdownMessage } from './MarkdownMessage';
import { TranscriptView } from './TranscriptView';

interface DocumentBodyProps {
  content: string;
  /** Só páginas do tipo Transcrição passam pela leitura com tempo; as demais são Markdown. */
  isTranscription: boolean;
  /** Endereço do vídeo original (o horário de cada trecho abre o vídeo nesse momento). */
  sourceUrl?: string;
  /** Coluna da página para a barra lateral da transcrição (ver `TranscriptView`). */
  railSlot?: HTMLElement | null;
  /** Capítulo de livro: a transcrição mostra só horário e parágrafo. */
  compact?: boolean;
  /** Prefixo dos ids dos títulos (vários documentos na mesma tela, como no livro). */
  idPrefix?: string;
}

/**
 * Corpo de uma página da biblioteca, o mesmo na página, no modo leitura e nos capítulos de um
 * livro: transcrição com tempo vira `TranscriptView`; o resto (resumos, transcrições antigas sem
 * tempo) é Markdown.
 */
export function DocumentBody({
  content,
  isTranscription,
  sourceUrl,
  railSlot,
  compact = false,
  idPrefix,
}: DocumentBodyProps) {
  const excerpts = useMemo(
    () => (isTranscription ? parseTimedTranscript(content) : null),
    [content, isTranscription],
  );

  if (excerpts) {
    return (
      <TranscriptView
        excerpts={excerpts}
        sourceUrl={sourceUrl}
        railSlot={railSlot}
        compact={compact}
      />
    );
  }

  return <MarkdownMessage content={content} headingIds idPrefix={idPrefix} size="inherit" />;
}
