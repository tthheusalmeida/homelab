export const OllamaErrorMessages = {
  unreachable:
    'Não foi possível conectar ao Ollama. Confira se ele está aberto e se o endereço em Configurações está certo.',
  modelNotFound:
    'O modelo escolhido não está instalado no Ollama. Instale-o no Ollama ou escolha outro modelo.',
  outOfMemory: 'O computador não tem memória suficiente para este modelo. Escolha um modelo menor.',
  timeout: 'O Ollama demorou demais para responder. Tente de novo ou escolha um modelo menor.',
  unknown: 'A requisição para o chat do Ollama falhou.',
} as const;

const UNREACHABLE_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN']);
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ECONNABORTED']);

interface AxiosLikeError {
  code?: unknown;
  response?: { status?: unknown; data?: unknown };
}

/** Texto do erro que o próprio Ollama devolveu (`{ "error": "..." }`), se houver. */
function serverMessage(error: AxiosLikeError): string {
  const data = error.response?.data;

  if (data && typeof data === 'object' && 'error' in data) {
    return String(data.error);
  }

  return typeof data === 'string' ? data : '';
}

/** Motivo da falha do Ollama em português (conexão, modelo ausente, memória, demora). */
export function describeOllamaError(error: unknown): string {
  const failure = (error && typeof error === 'object' ? error : {}) as AxiosLikeError;
  const code = typeof failure.code === 'string' ? failure.code : '';
  const status = typeof failure.response?.status === 'number' ? failure.response.status : undefined;
  const detail = serverMessage(failure);

  if (UNREACHABLE_CODES.has(code)) {
    return OllamaErrorMessages.unreachable;
  }

  if (TIMEOUT_CODES.has(code)) {
    return OllamaErrorMessages.timeout;
  }

  if (status === 404 || /model .*not found|try pulling/i.test(detail)) {
    return OllamaErrorMessages.modelNotFound;
  }

  if (/memory/i.test(detail)) {
    return OllamaErrorMessages.outOfMemory;
  }

  return OllamaErrorMessages.unknown;
}
