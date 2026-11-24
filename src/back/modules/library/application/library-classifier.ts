import { BadGatewayException, Injectable, Optional } from '@nestjs/common';

import type { AIProviderName, AIRetryInfo } from '../../ai/ai.model';
import { AIService } from '../../ai/ai.service';
import { buildClassificationPrompt } from '../../ai/prompts/library-classification.prompt';
import { PromptService } from '../../ai/prompts/prompt.service';
import { DefaultAiService } from '../../ai/default-ai.service';

import type { CategoryNode } from '../domain/categories';
import { MAX_CATEGORY_DEPTH } from '../domain/library.types';
import { normalizeKey, sanitizeCategoryPath } from '../domain/naming';

import { LibraryService } from './library.service';

const MAX_CONTENT_CHARS = 6000;
const MAX_TITLE_CHARS = 120;
const MAX_TAGS = 6;
const MAX_KNOWN_TAGS = 60;

export interface ClassificationSuggestion {
  title: string;
  category: string[];
  tags: string[];
  /** Modelo usado na sugestão. */
  model: string;
}

/** Pedido de classificação de um texto que ainda não está na biblioteca (ex.: o resumo de um PDF). */
export interface ClassifyTextInput {
  /** Título atual (o prompt o mantém se já for bom). */
  title: string;
  content: string;
  providerId: AIProviderName;
  modelId: string;
  thinking?: string;
  /** Quantos caracteres do conteúdo vão ao modelo (padrão: o mesmo das páginas da biblioteca). */
  maxContentChars?: number;
  onRetry?: (info: AIRetryInfo) => void;
  /** Cancela a chamada à IA (cancelar o job). */
  signal?: AbortSignal;
}

@Injectable()
export class LibraryClassifier {
  constructor(
    private readonly library: LibraryService,
    private readonly ai: AIService,
    private readonly defaultAi: DefaultAiService,
    // Sem ele (testes), vale sempre o prompt padrão.
    @Optional() private readonly prompts?: PromptService,
  ) {}

  /** Pede à IA em uso (padrão ou troca da sessão) uma sugestão de título, categoria e tags. */
  async suggest(id: string, modelId?: string): Promise<ClassificationSuggestion> {
    const { meta, content } = await this.library.get(id);

    return this.classify({
      title: meta.title,
      content,
      ...this.defaultAi.resolve({ modelId }),
    });
  }

  /**
   * Sugere título, categoria e tags para um texto, **preferindo as categorias e tags que a biblioteca
   * já tem**, com o provedor e o modelo informados (Gemini ou Ollama).
   */
  async classify(input: ClassifyTextInput): Promise<ClassificationSuggestion> {
    const tree = await this.library.categories();
    const knownTags = this.library
      .tags()
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_KNOWN_TAGS)
      .map((entry) => entry.tag);

    const model = input.modelId;

    const prompt = buildClassificationPrompt(
      {
        title: input.title,
        content: input.content.slice(0, input.maxContentChars ?? MAX_CONTENT_CHARS),
        categories: flattenCategories(tree),
        tags: knownTags,
      },
      this.prompts?.instructionsFor('classification'),
    );

    let answer: string;

    try {
      answer = await this.ai.chat({
        message: prompt,
        modelId: model,
        providerId: input.providerId,
        json: true,
        ...(input.thinking ? { thinking: input.thinking } : {}),
        ...(input.onRetry ? { onRetry: input.onRetry } : {}),
        ...(input.signal ? { signal: input.signal } : {}),
      });
    } catch (error) {
      throw new BadGatewayException('Não foi possível obter a sugestão da IA. Tente novamente.', {
        cause: error,
      });
    }

    const raw = parseJsonObject(answer);

    return {
      title: cleanTitle(raw.title) || input.title,
      category: cleanCategory(raw.category, tree),
      tags: cleanTags(raw.tags, knownTags),
      model,
    };
  }
}

function invalidAnswer(): BadGatewayException {
  return new BadGatewayException('A IA não retornou uma sugestão válida. Tente novamente.');
}

/** Extrai o objeto JSON da resposta, mesmo se vier dentro de cercas de código. */
function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw invalidAnswer();
  }

  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw invalidAnswer();
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw invalidAnswer();
  }
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function cleanTitle(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_CHARS)
    : '';
}

/** Caminhos existentes (`A > B`), para o prompt preferir categorias já criadas. */
function flattenCategories(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((node) => [node.path.join(' > '), ...flattenCategories(node.children)]);
}

/**
 * Valida a categoria sugerida e, em cada nível, reaproveita a grafia de uma
 * pasta existente (ignorando acento e maiúscula) em vez de criar uma duplicata.
 */
function cleanCategory(value: unknown, tree: CategoryNode[]): string[] {
  const path = asStringList(value).slice(0, MAX_CATEGORY_DEPTH);

  if (path.length === 0) {
    throw invalidAnswer();
  }

  let sanitized: string[];

  try {
    sanitized = sanitizeCategoryPath(path);
  } catch {
    throw invalidAnswer();
  }

  let level = tree;

  return sanitized.map((name) => {
    const existing = level.find((node) => normalizeKey(node.name) === normalizeKey(name));

    level = existing?.children ?? [];

    return existing?.name ?? name;
  });
}

function cleanTags(value: unknown, knownTags: string[]): string[] {
  const result: string[] = [];

  for (const item of asStringList(value)) {
    const key = normalizeKey(item);
    const tag =
      knownTags.find((known) => normalizeKey(known) === key) ??
      item.replace(/\s+/g, ' ').toLowerCase();

    if (tag && !result.includes(tag)) {
      result.push(tag);
    }
  }

  return result.slice(0, MAX_TAGS);
}
