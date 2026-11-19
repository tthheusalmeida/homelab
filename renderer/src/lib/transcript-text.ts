/** Textos da transcrição com tempo (barra lateral, chip do horário e configuração). */
export const TranscriptStrings = {
  railLabel: 'Trechos da transcrição',
  railTitle: 'Linha do tempo',
  goTo: (clock: string) => `Ir para ${clock}`,
  excerptLabel: (clock: string) => `Trecho de ${clock}`,
  excerptProgress: 'Progresso do trecho',
  openAt: 'Abrir o vídeo neste momento',
  openVideo: 'Abrir o vídeo (esta plataforma não abre no momento exato)',
  previewOption: 'Mostrar o começo dos trechos',
  previewHint:
    'Transcrições com tempo: mostra o começo de cada trecho ao lado do horário, na barra lateral',
} as const;

/** Primeiras palavras do trecho, para a barra lateral (o texto completo fica no corpo). */
export function excerptPreview(text: string, words = 5): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);

  return parts.length <= words ? parts.join(' ') : `${parts.slice(0, words).join(' ')}…`;
}
