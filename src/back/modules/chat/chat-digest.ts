import type { ChatDigest } from '../../../shared/chat-history';
import type { AIChatTurn } from '../ai/ai.model';

import { withoutCitations } from './chat-context';

/** Cada fala entra no pedido de resumo com no máximo isto (resposta longa não precisa ir inteira). */
const MAX_TURN_CHARS = 1_500;

/** O histórico que vai ao modelo: o que o resumo não cobre, sem as marcas `[n]` de respostas antigas. */
export function historyTurns(
  messages: ReadonlyArray<AIChatTurn>,
  digest?: ChatDigest | null,
): AIChatTurn[] {
  return messages.slice(Math.min(digest?.upTo ?? 0, messages.length)).map(({ role, content }) => ({
    role,
    // as marcas [n] de respostas antigas não valem para os trechos desta vez
    content: role === 'assistant' ? withoutCitations(content) : content,
  }));
}

/** O resumo como o começo da conversa: o modelo o lê como algo já dito, e não como instrução. */
export function digestTurns(digest?: ChatDigest | null): AIChatTurn[] {
  if (!digest) {
    return [];
  }

  return [
    { role: 'user', content: `Resumo do que conversamos até aqui:\n${digest.text}` },
    { role: 'assistant', content: 'Entendi. Sigo a partir desse resumo.' },
  ];
}

function clip(text: string): string {
  return text.length > MAX_TURN_CHARS ? `${text.slice(0, MAX_TURN_CHARS)}…` : text;
}

/** Pedido de resumo: junta o resumo anterior (se houver) às falas que ainda não foram resumidas. */
export function digestPrompt(
  previous: string | undefined,
  turns: ReadonlyArray<AIChatTurn>,
): string {
  const talk = turns
    .map(
      ({ role, content }) =>
        `${role === 'user' ? 'Usuário' : 'Assistente'}: ${clip(role === 'assistant' ? withoutCitations(content) : content)}`,
    )
    .join('\n\n');

  return [
    'Resuma a conversa abaixo em português, em no máximo 200 palavras.',
    'Mantenha o que o usuário quer saber ou fazer, os fatos, nomes, números e decisões já ditos e o que ficou pendente. Não invente nada e não comente o resumo.',
    'Responda só com o resumo.',
    '',
    ...(previous ? ['Resumo anterior:', previous, ''] : []),
    'Conversa:',
    talk,
  ].join('\n');
}
