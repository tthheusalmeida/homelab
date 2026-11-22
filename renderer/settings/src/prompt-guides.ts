import type { PromptKind } from '#shared/contracts/prompts';

/** Um exemplo pronto: um ajuste de uma linha que vai no fim do texto padrão. */
export interface PromptExample {
  id: string;
  name: string;
  /** Para que serve, em uma frase. */
  description: string;
  /** A linha acrescentada ao texto padrão (escrita como as instruções do próprio padrão). */
  addition: string;
}

/** Orientações de um prompt: o que dá para acrescentar, onde ter cuidado e exemplos para começar. */
export interface PromptGuide {
  canAdd: readonly string[];
  careful: readonly string[];
  examples: readonly PromptExample[];
}

/** Título da seção onde o exemplo entra no texto. */
export const EXAMPLE_HEADING = '# AJUSTES';

/**
 * O texto de partida de um exemplo: o padrão do app **inteiro** mais o ajuste no final. Acrescentar
 * (em vez de reescrever) mantém tudo o que já funciona no padrão.
 */
export function withExample(defaultText: string, example: PromptExample): string {
  return `${defaultText.trimEnd()}\n\n${EXAMPLE_HEADING}\n\n- ${example.addition}`;
}

const CAREFUL_COMMON = [
  'Não peça quantidades (número de ramos, de seções, de palavras ou de tags): o app já fixa os limites e corta o que passar.',
  'Não peça outro formato de resposta (tabela, lista numerada, JSON): a resposta precisa vir no formato que o app entende.',
  'Não apague o texto base de uma vez: acrescente e ajuste, para não perder o que já funciona. Se der errado, volte ao padrão do app.',
] as const;

/**
 * Orientações e exemplos de cada prompt. O `Record` obriga a escrever um guia para todo prompt novo
 * que entrar em `PROMPT_KINDS`.
 */
export const PROMPT_GUIDES: Record<PromptKind, PromptGuide> = {
  summary: {
    canAdd: [
      'O que merece mais atenção (definições, passos, exemplos, comandos).',
      'Algo a incluir no final (lista de termos, pontos para revisar), sempre só com o que a fonte traz.',
      'O tipo de linguagem (mais simples, mais técnica).',
    ],
    careful: [
      'O texto base tem as regras de fidelidade (usar só o que está na fonte). Se você apagá-las, a IA pode inventar informação.',
      'O nível de detalhe (resumido, detalhado ou estudo) você escolhe em cada tarefa, não aqui.',
      ...CAREFUL_COMMON,
    ],
    examples: [
      {
        id: 'study',
        name: 'Para estudar',
        description: 'Dá atenção às definições e aos passos.',
        addition:
          'Dê atenção especial a definições, passos e exemplos, e mantenha cada um completo, com a explicação dada na fonte.',
      },
      {
        id: 'bullets',
        name: 'Em tópicos',
        description: 'Prefere listas curtas a parágrafos longos.',
        addition:
          'Prefira listas curtas a parágrafos longos sempre que a fonte permitir, mantendo cada item completo.',
      },
      {
        id: 'glossary',
        name: 'Com glossário',
        description: 'Termina com os termos técnicos e o que cada um significa.',
        addition:
          'No final, acrescente a seção "Termos" listando os termos técnicos que apareceram, cada um com a explicação dada na fonte.',
      },
    ],
  },
  mindMap: {
    canAdd: [
      'Que tipo de informação priorizar (datas, fórmulas, comandos, nomes).',
      'O jeito da frase curta de cada ramo (pergunta, definição, exemplo).',
      'O tom e o idioma.',
    ],
    careful: CAREFUL_COMMON,
    examples: [
      {
        id: 'exam',
        name: 'Para prova',
        description: 'Foca no que cai em prova e escreve as frases como perguntas.',
        addition:
          'Priorize datas, nomes próprios, fórmulas e definições. Em cada ramo, escreva a frase curta como uma pergunta que a pessoa consiga responder de cabeça.',
      },
      {
        id: 'lean',
        name: 'Enxuto',
        description: 'Só termos, quase sem frases.',
        addition:
          'Use só termos e palavras-chave, sem frases. Só dê uma frase curta quando o termo sozinho não lembrar nada.',
      },
      {
        id: 'steps',
        name: 'Passos e comandos',
        description: 'Dá atenção às etapas, comandos e valores, na ordem.',
        addition:
          'Dê atenção especial a etapas, comandos e valores, na ordem em que aparecem, e deixe a teoria em segundo plano.',
      },
    ],
  },
  infographic: {
    canAdd: [
      'O tom (descontraído, formal, para iniciantes).',
      'O que destacar (números, comparações, etapas).',
      'Como escolher e variar as peças ilustradas.',
    ],
    careful: [
      'A estrutura (capa, seções e fechamento) e os modelos de cada seção são do app: peça o estilo e o foco, não a estrutura.',
      ...CAREFUL_COMMON,
    ],
    examples: [
      {
        id: 'beginners',
        name: 'Para iniciantes',
        description: 'Tom leve, frases curtas e sem jargão.',
        addition:
          'Escreva como se explicasse a alguém que nunca viu o assunto, com tom leve e frases bem curtas, sem jargão.',
      },
      {
        id: 'numbers',
        name: 'Foco em números',
        description: 'Prefere os modelos de dados e destaca números e datas.',
        addition:
          'Dê preferência aos modelos que mostram dados, comparações e rankings, e destaque todos os números e datas do resumo.',
      },
      {
        id: 'formal',
        name: 'Tom formal',
        description: 'Frases completas e vocabulário preciso.',
        addition:
          'Use um tom formal e técnico, com frases completas e vocabulário preciso, sem gírias.',
      },
    ],
  },
  classification: {
    canAdd: [
      'O critério das categorias (por área de estudo, por projeto).',
      'O estilo das tags (minúsculas, no singular).',
      'Como nomear o título.',
    ],
    careful: [
      'A quantidade de níveis da categoria e de tags é do app: peça o critério, não o tamanho.',
      ...CAREFUL_COMMON,
    ],
    examples: [
      {
        id: 'area',
        name: 'Por área de estudo',
        description: 'Categorias por assunto, não por tipo de documento.',
        addition:
          'Prefira categorias por área de estudo (por exemplo, Programação ou Saúde) e não por tipo de documento.',
      },
      {
        id: 'tags',
        name: 'Tags simples',
        description: 'Tags em minúsculas e no singular.',
        addition:
          'Escreva as tags em minúsculas e no singular, sem acentos e sem repetir a categoria.',
      },
      {
        id: 'project',
        name: 'Por projeto ou curso',
        description: 'O nome do projeto ou do curso vira a primeira categoria.',
        addition:
          'Quando o documento for de um projeto ou curso, use o nome do projeto ou do curso como a primeira categoria.',
      },
    ],
  },
};
