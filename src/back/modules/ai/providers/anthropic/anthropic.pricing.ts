import { type ModelPrice, type PriceTier, ModelCatalog } from '../shared/model-catalog';

export type AnthropicModelPricing = ModelPrice;

/**
 * Modelos de texto da Anthropic abertos a qualquer chave de API, com o preço por milhão de tokens.
 * Ficam de fora os de acesso restrito a organizações verificadas (Mythos) e os aposentados na API
 * (Opus 4.1, Opus 4, Sonnet 4). Só estes aparecem na lista de modelos.
 * Conferir em https://platform.claude.com/docs/en/about-claude/pricing.
 *
 * O Haiku 5.5 tem duas faixas: prompt de até 100 mil tokens e prompt maior.
 */
const tiers = new Map<string, PriceTier[]>([
  [
    'claude-haiku-5-5',
    [
      { maxPromptTokens: 100_000, inputPerMillionTokens: 0.1, outputPerMillionTokens: 0.5 },
      { inputPerMillionTokens: 0.5, outputPerMillionTokens: 2.5 },
    ],
  ],
  ['claude-haiku-4-5', [{ inputPerMillionTokens: 1, outputPerMillionTokens: 5 }]],
  ['claude-sonnet-5-5', [{ inputPerMillionTokens: 2, outputPerMillionTokens: 10 }]],
  ['claude-sonnet-5', [{ inputPerMillionTokens: 2, outputPerMillionTokens: 10 }]],
  ['claude-sonnet-4-6', [{ inputPerMillionTokens: 3, outputPerMillionTokens: 15 }]],
  ['claude-sonnet-4-5', [{ inputPerMillionTokens: 3, outputPerMillionTokens: 15 }]],
  ['claude-opus-5-5', [{ inputPerMillionTokens: 4, outputPerMillionTokens: 20 }]],
  ['claude-opus-5', [{ inputPerMillionTokens: 5, outputPerMillionTokens: 25 }]],
  ['claude-opus-4-8', [{ inputPerMillionTokens: 5, outputPerMillionTokens: 25 }]],
  ['claude-opus-4-7', [{ inputPerMillionTokens: 5, outputPerMillionTokens: 25 }]],
  ['claude-opus-4-6', [{ inputPerMillionTokens: 5, outputPerMillionTokens: 25 }]],
  ['claude-opus-4-5', [{ inputPerMillionTokens: 5, outputPerMillionTokens: 25 }]],
  ['claude-fable-5-2', [{ inputPerMillionTokens: 8, outputPerMillionTokens: 40 }]],
  ['claude-fable-5-1', [{ inputPerMillionTokens: 10, outputPerMillionTokens: 50 }]],
  ['claude-fable-5', [{ inputPerMillionTokens: 10, outputPerMillionTokens: 50 }]],
]);

/** Tira o sufixo de data (`claude-haiku-4-5-20251001` vira `claude-haiku-4-5`). */
export function normalizeAnthropicModel(model: string): string {
  return model.replace(/-\d{8}$/, '');
}

/** Catálogo da Anthropic: lista, custo e ordem dos modelos (regras comuns em `ModelCatalog`). */
export const anthropicCatalog = new ModelCatalog(tiers, normalizeAnthropicModel);

/** O modelo está cadastrado (aberto e com preço conhecido)? */
export function isPricedAnthropicModel(model: string): boolean {
  return anthropicCatalog.has(model);
}

/** Preço do modelo para um prompt do tamanho dado; `undefined` se o modelo não está cadastrado. */
export function anthropicPricing(
  model: string,
  promptTokens = 0,
): AnthropicModelPricing | undefined {
  return anthropicCatalog.price(model, promptTokens);
}

/** Modelos cadastrados do mais barato ao mais caro (entrada + saída, faixa de prompt curto). */
export function anthropicModelsByCost(): string[] {
  return anthropicCatalog.byCost();
}

/** Modelo cadastrado com o menor custo. */
export function cheapestAnthropicModel(): string {
  return anthropicCatalog.cheapest();
}
