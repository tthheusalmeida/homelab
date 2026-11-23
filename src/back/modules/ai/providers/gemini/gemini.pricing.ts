export interface GeminiModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

/**
 * Modelos de texto do Gemini com o preço de hoje (faixa padrão, prompt até 200 mil tokens).
 * Só estes aparecem na lista de modelos. Conferir em https://ai.google.dev/gemini-api/docs/pricing.
 */
export const pricing = new Map<string, GeminiModelPricing>([
  ['gemini-3.1-flash-lite', { inputPerMillionTokens: 0.25, outputPerMillionTokens: 1.5 }],
  ['gemini-3.5-flash-lite', { inputPerMillionTokens: 0.3, outputPerMillionTokens: 2.5 }],
  ['gemini-3-flash-preview', { inputPerMillionTokens: 0.5, outputPerMillionTokens: 3 }],
  ['gemini-3.6-flash', { inputPerMillionTokens: 0.75, outputPerMillionTokens: 3.75 }],
  ['gemini-3.8-flash', { inputPerMillionTokens: 0.75, outputPerMillionTokens: 3.75 }],
  ['gemini-3.5-flash', { inputPerMillionTokens: 0.75, outputPerMillionTokens: 4.5 }],
  ['gemini-4-hydrogen', { inputPerMillionTokens: 1.5, outputPerMillionTokens: 7.5 }],
  ['gemini-3.1-pro-preview', { inputPerMillionTokens: 2, outputPerMillionTokens: 12 }],
  ['gemini-4-carbon', { inputPerMillionTokens: 2, outputPerMillionTokens: 10 }],
  ['gemini-4-argon', { inputPerMillionTokens: 2, outputPerMillionTokens: 10 }],
  ['gemini-4-neon', { inputPerMillionTokens: 3, outputPerMillionTokens: 15 }],
]);

function totalCost(price: GeminiModelPricing): number {
  return price.inputPerMillionTokens + price.outputPerMillionTokens;
}

/** Modelos cadastrados do mais barato ao mais caro (entrada + saída por milhão de tokens). */
export function modelsByCost(): string[] {
  return [...pricing.entries()]
    .sort(([nameA, a], [nameB, b]) => totalCost(a) - totalCost(b) || nameA.localeCompare(nameB))
    .map(([name]) => name);
}

/** Modelo cadastrado com o menor custo (entrada + saída por milhão de tokens). */
export function cheapestModel(): string {
  return modelsByCost()[0] ?? '';
}
