import type { ContextCheck } from "#shared/tokens";

import type { AiModel } from "./types/chat";

/** "~850 tokens", "~12 mil tokens", "~1,2 milhão de tokens": só uma ideia do tamanho. */
export function formatTokens(tokens: number): string {
  if (tokens < 1_000) {
    return `~${tokens} tokens`;
  }

  if (tokens < 1_000_000) {
    const thousands = tokens / 1_000;

    return `~${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(".", ",")} mil tokens`;
  }

  return `~${(tokens / 1_000_000).toFixed(1).replace(".", ",")} milhão de tokens`;
}

/** Percentual do limite já usado, ou `null` quando o limite do modelo é desconhecido. */
export function contextPercent(check: ContextCheck): number | null {
  return check.ratio === null ? null : Math.round(check.ratio * 100);
}

/** Limite de entrada do modelo (0 ou ausente = desconhecido). */
export function modelContextLimit(model?: AiModel): number | null {
  const limit = model?.details?.context_length ?? model?.contextWindow ?? 0;

  return limit > 0 ? limit : null;
}

/**
 * Tamanho do modelo em bilhões de parâmetros, lido do texto que o Ollama informa ("0.8B", "4.7B",
 * "560M"); `null` quando não informa (modelos na nuvem).
 */
export function modelParameterBillions(model?: AiModel): number | null {
  const match = model?.details?.parameter_size?.trim().match(/^([\d.]+)\s*([MBK])/i);
  const amount = match ? Number(match[1]) : Number.NaN;

  if (!match || !(amount > 0)) {
    return null;
  }

  const unit = match[2].toUpperCase();

  return unit === "B" ? amount : unit === "M" ? amount / 1_000 : amount / 1_000_000;
}
