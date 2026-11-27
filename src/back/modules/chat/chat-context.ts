import type { ChatReference } from '../../../shared/contracts/chat';

/** Um trecho de página que acompanha a pergunta (o que o chat precisa saber dele). */
export interface ChatContextPassage {
  documentId: string;
  title: string;
  category: string[];
  headingPath: string[];
  anchor: string | null;
  text: string;
  /** Fração (0 a 1) das palavras da pergunta que o trecho contém, quando a busca sabe dizer. */
  coverage?: number;
}

/**
 * Fonte de contexto do chat: devolve os trechos das páginas do usuário que ajudam a responder (vazio
 * se a pergunta não tem a ver com elas). É uma porta: o chat não sabe como a busca é feita.
 */
export interface ChatContextSource {
  /**
   * @param options.contextLimit janela de contexto do modelo, em tokens
   * @param options.modelBillions tamanho do modelo, em bilhões de parâmetros
   *   (os dois definem quantos trechos acompanham a pergunta: janela curta e modelo pequeno recebem menos)
   */
  retrieve(
    question: string,
    previousQuestion?: string,
    options?: { contextLimit?: number; modelBillions?: number },
  ): Promise<ChatContextPassage[]>;
}

export const CHAT_CONTEXT = Symbol('CHAT_CONTEXT');

const CITATION = /\[(\d{1,2})\]/g;

/** Sem citação, só o 1º trecho vira referência, e só se casa com (quase) toda a pergunta. */
export const STRONG_COVERAGE = 0.75;

/**
 * Resposta antiga sem as marcas `[1]`, `[2]`. Elas só valem para os trechos daquela vez; reenviadas
 * no histórico, se confundem com a numeração dos trechos novos e ainda levam o modelo a repeti-las.
 */
export function withoutCitations(text: string): string {
  return text.replace(/[ \t]?\[\d{1,2}\]/g, '');
}

/** Tamanho máximo da primeira frase olhada para saber se a resposta diz que não achou nada. */
const NOT_FOUND_WINDOW = 160;

const NOT_FOUND =
  /\bnao (foi possivel )?(encontr|localiz)|\bnao (ha|existe|existem|tenho|temos|consta|constam|achei)\b[^.!?\n]*\b(informac|trecho|pagina|conteudo|nada|nenhum|registro|mencao|resultado|dado)|\bnao (trata|tratam|menciona|mencionam|aborda|abordam)\b|\bnada (encontrado|sobre)\b/;

/**
 * Frase que diz que as páginas **não trazem** o assunto ("Não há nenhuma informação sobre isso na
 * lista [1], [2]", "ele não cobre receitas"). Uma citação dentro de uma frase assim não é fonte da
 * resposta: modelos pequenos citam o trecho justamente para dizer que ele não serve. Só vale quando
 * a negação fala de informação, trecho ou página, para não derrubar "não há uma definição única [3]".
 */
const NEGATES_PAGES =
  /\bnao (ha|existe|existem|tem|consta|constam|contem|trata|tratam|cobre|cobrem|aborda|abordam|menciona|mencionam)\b[^.!?\n]*\b(informac|trecho|pagina|conteudo|assunto|detalhe|receita|lista|material|documento)|\bnenhum(a)? (informac|trecho|pagina|conteudo|mencao)/;

/** A resposta sem as frases que negam as páginas (e, com elas, as marcas que só dizem "isto não serve"). */
function withoutNegatedSentences(answer: string): string {
  return answer
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => !NEGATES_PAGES.test(normalize(sentence)))
    .join(' ');
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** A negação precisa estar logo no começo (aceita um "Com base nos trechos fornecidos," antes). */
const NOT_FOUND_MAX_POSITION = 70;

/** Palavras que viram a frase ("Tenho X, mas não encontrei Y"): aí a resposta traz conteúdo. */
const CONTRAST = /\b(mas|porem|embora|contudo|entretanto)\b/;

/**
 * A resposta **abre** dizendo que não achou o assunto nas páginas ("Não encontrei isso nas suas
 * páginas")? Só a primeira frase conta, e a negação precisa vir logo no começo e sem uma ressalva
 * ("mas", "porém") antes dela: "Tenho isso nas suas páginas, mas não encontrei o prazo" traz
 * conteúdo e continua com as referências. Modelos pequenos às vezes dizem "não encontrei" e citam
 * mesmo assim; nesse caso as referências ficam de fora.
 */
export function saysNotFound(answer: string): boolean {
  const start = (answer.split(/[.!?\n]/, 1)[0] ?? '')
    .slice(0, NOT_FOUND_WINDOW)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const match = NOT_FOUND.exec(start);

  return (
    match !== null &&
    match.index <= NOT_FOUND_MAX_POSITION &&
    !CONTRAST.test(start.slice(0, match.index))
  );
}

/**
 * Histórico sem as perguntas que foram respondidas com "não encontrei". Elas não ensinam nada ao
 * modelo e o **contaminam**: depois de uma resposta assim, modelos pequenos repetem "não encontrei"
 * até para o que está nas páginas. Vale só quando a pergunta nova tem páginas relevantes; o chat
 * gravado e a tela continuam com tudo.
 */
export function withoutDeadEnds<T extends { role: 'user' | 'assistant'; content: string }>(
  turns: T[],
): T[] {
  const kept: T[] = [];

  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index];
    const answer = turns[index + 1];

    if (turn.role === 'user' && answer?.role === 'assistant' && saysNotFound(answer.content)) {
      index += 1;
      continue;
    }

    kept.push(turn);
  }

  return kept;
}

/** Nome do trecho para o modelo e para a lista: `Título › Seção › Subseção`. */
function labelOf(passage: ChatContextPassage): string {
  const sections = passage.headingPath.filter((name) => name !== passage.title);

  return [passage.title, ...sections].join(' › ');
}

/**
 * Junta os trechos da **mesma seção** (na ordem em que aparecem): cada seção vira uma só fonte. É o
 * que faz o número `[n]` que o modelo escreve ser exatamente o número da referência na lista da
 * tela (1, 2, 3…), sem nenhuma conversão depois.
 */
export function groupBySection(passages: ChatContextPassage[]): ChatContextPassage[] {
  const sections = new Map<string, ChatContextPassage>();

  for (const passage of passages) {
    const key = passage.documentId + '#' + (passage.anchor ?? '');
    const section = sections.get(key);

    if (section) {
      section.text = section.text + '\n\n' + passage.text;
    } else {
      sections.set(key, { ...passage });
    }
  }

  return [...sections.values()];
}

/**
 * Pergunta com os trechos numerados à frente. O que o usuário escreveu **não muda** (é o que fica
 * gravado no chat); só o que vai ao modelo carrega o contexto.
 */
export function withContext(question: string, passages: ChatContextPassage[]): string {
  if (passages.length === 0) {
    return question;
  }

  const excerpts = groupBySection(passages)
    .map((section, index) => `[${index + 1}] ${labelOf(section)}\n${section.text}`)
    .join('\n\n');

  return [
    'Abaixo estão trechos numerados das páginas da biblioteca do usuário.',
    'Quando algum trecho ajuda a responder, dê prioridade a ele: baseie a resposta no trecho, comece direto pela resposta e cite o número, como [1], depois de cada afirmação tirada dele.',
    'Se os trechos cobrem só uma parte, use o que eles trazem (citando) e complete com o que você sabe.',
    'Se nenhum trecho tratar do assunto, ignore-os e responda normalmente com o seu melhor conhecimento, sem citar número e sem comentar que não achou nas páginas.',
    'Fale com o usuário em segunda pessoa, de forma simples e direta, sem dizer "trechos fornecidos" nem "documentos".',
    '',
    'Trechos:',
    excerpts,
    '',
    `Pergunta: ${question}`,
  ].join('\n');
}

/**
 * Referências da resposta: **todas** as páginas que acompanharam a pergunta, uma por seção e na
 * ordem em que foram numeradas para o modelo. O `number` de cada uma é o `[n]` que o texto usa
 * para apontar para ela (a tela o mostra no ícone, ligando o texto à fonte). Só há referências
 * quando a resposta se apoia nas páginas: o modelo citou ao menos uma seção (fora de uma frase que
 * nega as páginas) ou a primeira casa com quase toda a pergunta (modelos pequenos às vezes esquecem
 * de citar). Referência errada pesa mais que referência faltando: resposta que diz não ter achado,
 * ou que só cita para dizer que o trecho não serve, fica sem lista.
 */
export function referencesFor(answer: string, passages: ChatContextPassage[]): ChatReference[] {
  if (saysNotFound(answer)) {
    return [];
  }

  const sections = groupBySection(passages);
  const cited = new Set(
    [...withoutNegatedSentences(answer).matchAll(CITATION)]
      .map((match) => Number(match[1]))
      .filter((n) => n >= 1),
  );
  const anyCited = sections.some((_, index) => cited.has(index + 1));
  const strongFirst = (sections[0]?.coverage ?? 0) >= STRONG_COVERAGE;

  if (!anyCited && !strongFirst) {
    return [];
  }

  return sections.map((section, index) => ({
    documentId: section.documentId,
    title: section.title,
    headingPath: section.headingPath,
    anchor: section.anchor,
    category: section.category,
    number: index + 1,
  }));
}

/** Menos palavras que isso é conversa ("oi", "tudo bem?"), não uma pergunta sobre as páginas. */
const MIN_QUESTION_WORDS = 4;

/**
 * Parece uma pergunta de verdade? É o que decide mostrar "não achei isso nas suas páginas" quando
 * nenhuma página serviu de referência: um "oi" não é uma busca que falhou.
 */
export function looksLikeAQuestion(text: string): boolean {
  return text.trim().split(/\s+/).filter(Boolean).length >= MIN_QUESTION_WORDS;
}
