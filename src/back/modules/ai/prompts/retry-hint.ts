/**
 * Acrescentado ao prompt quando a resposta anterior da IA não pôde ser lida (JSON inválido ou sem
 * nada aproveitável): lembra o formato e pede só o objeto, sem comentário. Ver `MAX_ANSWER_ATTEMPTS`.
 */
export const INVALID_ANSWER_RETRY_HINT = `# ATENÇÃO

A resposta anterior não pôde ser lida. Responda de novo com APENAS um objeto JSON válido, no formato pedido em SAÍDA: aspas duplas em todo texto, sem comentários, sem vírgula sobrando e sem nenhum texto antes ou depois do JSON.`;

/** Quantas vezes a geração tenta quando a resposta da IA vem inválida (a primeira conta). */
export const MAX_ANSWER_ATTEMPTS = 3;
