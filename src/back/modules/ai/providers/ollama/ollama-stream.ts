import { hasProperty, isObject, isString } from '../../../../utils/type-guards';

/** O que uma resposta transmitida do Ollama trouxe no fim. */
export interface OllamaStreamResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Lê a resposta em fluxo do `/api/chat` (uma linha JSON por pedaço) e entrega cada pedaço de texto a
 * `onChunk`. O pensamento do modelo (`message.thinking`) não vai para a resposta. Um erro no meio do
 * fluxo (`{"error": "..."}`) vira exceção.
 */
export async function readOllamaStream(
  stream: AsyncIterable<Buffer | string>,
  onChunk: (text: string) => void,
): Promise<OllamaStreamResult> {
  const result: OllamaStreamResult = { text: '', inputTokens: 0, outputTokens: 0 };
  const decoder = new TextDecoder();
  let pending = '';

  const handle = (line: string): void => {
    if (line.trim() === '') {
      return;
    }

    let data: unknown;

    try {
      data = JSON.parse(line);
    } catch {
      return;
    }

    if (!isObject(data)) {
      return;
    }

    if (hasProperty(data, 'error') && isString(data.error)) {
      throw new Error(data.error);
    }

    if (hasProperty(data, 'message') && isObject(data.message)) {
      const piece = hasProperty(data.message, 'content') ? data.message.content : '';

      if (isString(piece) && piece !== '') {
        result.text += piece;
        onChunk(piece);
      }
    }

    if (hasProperty(data, 'prompt_eval_count')) {
      result.inputTokens = Number(data.prompt_eval_count ?? 0);
    }

    if (hasProperty(data, 'eval_count')) {
      result.outputTokens = Number(data.eval_count ?? 0);
    }
  };

  for await (const part of stream) {
    pending += typeof part === 'string' ? part : decoder.decode(part, { stream: true });

    const lines = pending.split('\n');

    pending = lines.pop() ?? '';
    lines.forEach(handle);
  }

  handle(pending);

  return result;
}
