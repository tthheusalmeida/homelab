/** Os "passos bonitos" de um eixo: 1, 1,5, 2, 2,5, 5 e 10 vezes uma potência de dez. */
const NICE_STEPS = [1, 1.5, 2, 2.5, 5, 10];

export interface ChartScale {
  /** O topo do eixo (um número redondo que contém o maior valor). */
  max: number;
  /** Os valores marcados no eixo, de 0 ao topo. */
  ticks: number[];
}

/**
 * Escala redonda para o eixo vertical de um gráfico de barras: com `intervals` divisões iguais e um
 * topo que cabe o maior valor (ex.: 47,2 mil vira 0, 15 mil, 30 mil, 45 mil e 60 mil). Sem dados
 * (tudo zero), mantém uma escala mínima para o gráfico não desabar.
 */
export function niceScale(maxValue: number, intervals = 4): ChartScale {
  const target = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const rough = target / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    (NICE_STEPS.find((candidate) => candidate * magnitude * intervals >= target) ?? 10) * magnitude;

  return {
    max: step * intervals,
    ticks: Array.from({ length: intervals + 1 }, (_, index) => step * index),
  };
}
