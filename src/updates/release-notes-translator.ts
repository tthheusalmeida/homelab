export const TranslatorMessages = {
  unavailable:
    'A IA local não está disponível. Abra o Ollama e instale um modelo para traduzir as notas.',
  failed: 'Não foi possível traduzir as notas. Tente de novo.',
} as const;

/** O pouco que o tradutor precisa de cada modelo do Ollama. */
export interface LocalModelInfo {
  name: string;
  /** Tamanho em bytes: o menor é o "mais barato" de rodar. */
  size: number;
  capabilities: string[];
}

/** Porta do `AIService` do back, restrita ao Ollama (a tradução nunca usa IA externa). */
export interface LocalAiPort {
  models(provider: 'ollama'): Promise<LocalModelInfo[]>;
  chat(request: {
    providerId: 'ollama';
    modelId: string;
    message: string;
    thinking?: string;
  }): Promise<string>;
}

/** Sem Ollama ligado ou sem nenhum modelo de texto instalado. */
export class TranslationUnavailableError extends Error {
  constructor() {
    super(TranslatorMessages.unavailable);
    this.name = 'TranslationUnavailableError';
  }
}

export function translationPrompt(notes: string): string {
  return [
    'Traduza para português do Brasil as notas de versão abaixo, escritas em Markdown.',
    'Regras: mantenha exatamente a estrutura do Markdown (títulos, listas e links); não traduza',
    'links, hashes de commit, números de versão nem trechos entre crases; responda apenas com o',
    'texto traduzido, sem explicações e sem cercar a resposta em bloco de código.',
    '',
    '---',
    notes,
  ].join('\n');
}

/** Alguns modelos devolvem o texto dentro de um bloco ```markdown; tira a cerca. */
export function stripCodeFence(text: string): string {
  const match = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(text.trim());

  return (match ? match[1] : text).trim();
}

/**
 * Traduz as notas da versão para português **só com a IA local** (Ollama), usando o modelo mais
 * barato (o menor, entre os que geram texto). Sem Ollama ligado, nada é traduzido e as notas ficam
 * em inglês. O resultado fica em memória por versão: traduzir de novo não chama o modelo.
 */
export class ReleaseNotesTranslator {
  private readonly cache = new Map<string, string>();

  constructor(private readonly ai: LocalAiPort) {}

  /** Há Ollama respondendo e ao menos um modelo de texto. */
  async available(): Promise<boolean> {
    return (await this.cheapestModel()) !== null;
  }

  async translate(version: string, notes: string): Promise<string> {
    const cached = this.cache.get(version);

    if (cached) {
      return cached;
    }

    const model = await this.cheapestModel();

    if (!model) {
      throw new TranslationUnavailableError();
    }

    const answer = stripCodeFence(
      await this.ai.chat({
        providerId: 'ollama',
        modelId: model,
        message: translationPrompt(notes),
        thinking: 'off',
      }),
    );

    if (!answer) {
      throw new Error(TranslatorMessages.failed);
    }

    this.cache.set(version, answer);

    return answer;
  }

  /** O menor modelo que gera texto (embeddings não servem); `null` se o Ollama não responde. */
  private async cheapestModel(): Promise<string | null> {
    let models: LocalModelInfo[];

    try {
      models = await this.ai.models('ollama');
    } catch {
      return null;
    }

    const text = models.filter(
      (model) =>
        model.capabilities.length === 0 ||
        model.capabilities.includes('completion') ||
        !model.capabilities.includes('embedding'),
    );

    if (text.length === 0) {
      return null;
    }

    return text.reduce((smallest, model) => (model.size < smallest.size ? model : smallest)).name;
  }
}
