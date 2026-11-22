/**
 * Os modelos (layouts) de infográfico. A IA escolhe um (ou o usuário o escolhe) e preenche os
 * espaços dele; a tela desenha o mesmo modelo. Back, prompt e tela usam esta lista (ver
 * `docs/infografico.md`).
 */
export const INFOGRAPHIC_LAYOUT_IDS = [
  'steps',
  'funnel',
  'timeline',
  'versus',
  'numbers',
  'radial',
  'ranking',
  'cycle',
  'myths',
  'mosaic',
] as const;

export type InfographicLayoutId = (typeof INFOGRAPHIC_LAYOUT_IDS)[number];

export interface InfographicLayoutInfo {
  id: InfographicLayoutId;
  /** Nome na tela. */
  label: string;
  /** Para que tipo de conteúdo serve (também vai no prompt). */
  bestFor: string;
  /** Quantidade de itens aceita (`items`); fora disso o infográfico é rejeitado (mais é cortado). */
  minItems: number;
  maxItems: number;
  /** Como cada campo é usado neste modelo (vai no prompt). */
  fields: string;
}

export const INFOGRAPHIC_LAYOUTS: readonly InfographicLayoutInfo[] = [
  {
    id: 'steps',
    label: 'Guia em passos',
    bestFor: 'processos, tutoriais e "como funciona", em ordem',
    minItems: 3,
    maxItems: 5,
    fields:
      'items = as etapas em ordem (title = nome da etapa, text = o que acontece); tips = até 4 dicas curtas (opcional)',
  },
  {
    id: 'funnel',
    label: 'Funil',
    bestFor: 'etapas que filtram ou afunilam (vendas, seleção, conversão)',
    minItems: 3,
    maxItems: 5,
    fields:
      'items = etapas do topo à base (title = nome da etapa, tag = número ou valor curto da etapa, text = explicação)',
  },
  {
    id: 'timeline',
    label: 'Linha do tempo',
    bestFor: 'história, evolução e cronologia',
    minItems: 3,
    maxItems: 7,
    fields:
      'items = marcos em ordem cronológica (tag = data ou ano, title = o marco, text = o que aconteceu)',
  },
  {
    id: 'versus',
    label: 'Comparativo',
    bestFor: 'comparar duas opções, prós e contras',
    minItems: 3,
    maxItems: 6,
    fields:
      'sides = exatamente 2 lados (title e piece de cada um); items = critérios (title = critério, text = como o lado A se sai, extra = como o lado B se sai, winner = "a", "b" ou "tie")',
  },
  {
    id: 'numbers',
    label: 'Números',
    bestFor: 'dados, quantidades e recomendações numéricas que aparecem no resumo',
    minItems: 3,
    maxItems: 4,
    fields:
      'items = destaques (tag = o número ou valor, curto, ex.: "7-9 h"; text = o que ele mede); note = observação final (opcional)',
  },
  {
    id: 'radial',
    label: 'Mapa de conceitos',
    bestFor: 'um tema central com várias facetas ou pilares',
    minItems: 4,
    maxItems: 6,
    fields:
      'title = o tema central; piece = a peça do centro; items = as facetas (title = termo, text = frase curta)',
  },
  {
    id: 'ranking',
    label: 'Ranking',
    bestFor: 'listas ordenadas, top N e prioridades',
    minItems: 3,
    maxItems: 7,
    fields:
      'items = do primeiro ao último (title, text, value = 0 a 100 que mede o critério); meterLabel = o que o valor mede (ex.: "Intensidade")',
  },
  {
    id: 'cycle',
    label: 'Ciclo',
    bestFor: 'processos que se repetem em círculo',
    minItems: 4,
    maxItems: 4,
    fields: 'items = exatamente 4 etapas em ordem (title = nome da etapa, text = o que acontece)',
  },
  {
    id: 'myths',
    label: 'Mitos e verdades',
    bestFor: 'corrigir enganos comuns',
    minItems: 3,
    maxItems: 5,
    fields:
      'items = pares (title = o mito, como a pessoa diria; text = a verdade, segundo o resumo)',
  },
  {
    id: 'mosaic',
    label: 'Mosaico',
    bestFor: 'assuntos variados que não pedem uma estrutura única',
    minItems: 3,
    maxItems: 4,
    fields:
      'piece = a peça do destaque principal; items = blocos (title, text; tag = número de destaque, opcional); tips = de 2 a 4 itens de uma lista de verificação; note = uma frase de destaque (opcional)',
  },
];

export function isInfographicLayoutId(value: unknown): value is InfographicLayoutId {
  return (INFOGRAPHIC_LAYOUT_IDS as readonly unknown[]).includes(value);
}

export function layoutInfo(id: InfographicLayoutId): InfographicLayoutInfo {
  const info = INFOGRAPHIC_LAYOUTS.find((layout) => layout.id === id);

  if (!info) {
    throw new Error(`Modelo de infográfico desconhecido: ${id}`);
  }

  return info;
}

/**
 * O mínimo de itens que a leitura da resposta **aceita** em cada modelo. O prompt pede de `minItems`
 * a `maxItems`, mas um resumo curto não tem itens para tanto, e a IA (que só pode usar o que o
 * resumo diz) devolve menos: descartar a seção por isso derrubava resumos inteiros. Os desenhos
 * aguentam menos itens; só o ciclo precisa dos quatro (é um losango) e o mapa de conceitos de três
 * (um centro com menos de três facetas não forma um mapa).
 */
export const INFOGRAPHIC_ACCEPTED_MIN_ITEMS: Record<InfographicLayoutId, number> = {
  steps: 2,
  funnel: 2,
  timeline: 2,
  versus: 2,
  numbers: 2,
  radial: 3,
  ranking: 2,
  cycle: 4,
  myths: 2,
  mosaic: 2,
};

/** Quantas seções tem a história (com um modelo escolhido pelo usuário, é uma só). */
export const INFOGRAPHIC_SECTIONS = { min: 4, max: 6 } as const;

/**
 * O mínimo de seções válidas para aceitar uma história. O prompt pede de `min` a `max`, mas a
 * resposta é aceita com menos: seção que não se sustenta some e o resto ainda conta uma história.
 * Só abaixo disto a resposta é recusada (e a geração tenta de novo).
 */
export const INFOGRAPHIC_MIN_ACCEPTED_SECTIONS = 2;

/** Limites de texto (a IA é cortada neles, e o prompt os informa). */
export const INFOGRAPHIC_LIMITS = {
  maxKickerChars: 40,
  maxTitleChars: 70,
  maxSubtitleChars: 150,
  maxIntroChars: 320,
  maxTakeaways: 6,
  maxTakeawayChars: 120,
  maxItemTitleChars: 60,
  maxItemTextChars: 170,
  maxTagChars: 24,
  maxTips: 4,
  maxTipChars: 100,
  maxNoteChars: 200,
  maxMeterLabelChars: 24,
} as const;
