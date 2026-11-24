import { ModelCatalog } from '../shared/model-catalog';

/**
 * Modelos de texto da Groq com preço público, em dólar por milhão de tokens. Os modelos Llama estão
 * como "fale com vendas" no painel da Groq e ficam de fora até terem preço. Só estes aparecem na
 * lista de modelos. Conferir em https://console.groq.com/docs/models.
 */
export const groqCatalog = ModelCatalog.flat(
  new Map([
    ['openai/gpt-oss-20b', { inputPerMillionTokens: 0.075, outputPerMillionTokens: 0.3 }],
    ['openai/gpt-oss-120b', { inputPerMillionTokens: 0.15, outputPerMillionTokens: 0.6 }],
    ['qwen/qwen3.8-27b', { inputPerMillionTokens: 0.8, outputPerMillionTokens: 4 }],
  ]),
);
