/**
 * Limites de um mapa mental **editado pelo usuário** (um pouco mais folgados que os da IA, que
 * ficam em `back/modules/ai/prompts/mind-map.prompt.ts`). A tela de edição e o back usam os mesmos
 * números: a tela bloqueia o que passaria disso e o back corta, por segurança.
 */
export const MIND_MAP_EDIT_LIMITS = {
  /** Ramos de primeiro nível. */
  maxBranches: 20,
  /** Níveis abaixo do título: ramo, subtópico, detalhe e detalhe do detalhe. */
  maxDepth: 4,
  /** Nós no total, sem contar o título. */
  maxNodes: 150,
  /** Caracteres do termo de um nó. */
  maxLabelChars: 80,
  /** Caracteres da frase curta de um nó. */
  maxNoteChars: 220,
  /** Caracteres do subtítulo. */
  maxSubtitleChars: 100,
} as const;

export type MindMapLimits = {
  readonly [K in keyof typeof MIND_MAP_EDIT_LIMITS]: number;
};
