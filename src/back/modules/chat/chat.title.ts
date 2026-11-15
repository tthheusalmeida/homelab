export const MAX_TITLE_LENGTH = 60;

export const EMPTY_CHAT_TITLE = 'Nova conversa';

/** Título do chat: a primeira mensagem, com espaços normalizados e cortada em 60 caracteres. */
export function titleFromMessage(message: string): string {
  const normalized = message.replace(/\s+/g, ' ').trim();

  if (normalized === '') {
    return EMPTY_CHAT_TITLE;
  }

  return normalized.length > MAX_TITLE_LENGTH
    ? `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : normalized;
}
