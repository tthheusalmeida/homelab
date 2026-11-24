export interface ModelPrice {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}

/** Faixa de preço; `maxPromptTokens` vazio vale para qualquer tamanho de prompt. */
export interface PriceTier extends ModelPrice {
  maxPromptTokens?: number;
}

/**
 * Catálogo de modelos de um provider, com o preço de cada um (por milhão de tokens). Responde às
 * perguntas que todo provider de IA na nuvem faz: o modelo é cadastrado? quanto custa? qual o mais
 * barato? Só os modelos cadastrados aparecem na lista do app.
 */
export class ModelCatalog {
  /**
   * @param tiers faixas de preço por modelo (uma só, ou mais de uma quando o preço depende do prompt)
   * @param normalize deixa o ID do modelo na forma do catálogo (ex.: tira o sufixo de data)
   */
  constructor(
    private readonly tiers: ReadonlyMap<string, readonly PriceTier[]>,
    private readonly normalize: (model: string) => string = (model) => model,
  ) {}

  /** Cria o catálogo de um provider em que cada modelo tem um preço só. */
  static flat(
    prices: ReadonlyMap<string, ModelPrice>,
    normalize?: (model: string) => string,
  ): ModelCatalog {
    return new ModelCatalog(
      new Map([...prices].map(([name, price]) => [name, [price]] as const)),
      normalize,
    );
  }

  has(model: string): boolean {
    return this.tiers.has(this.normalize(model));
  }

  /** Preço para um prompt do tamanho dado; `undefined` se o modelo não está cadastrado. */
  price(model: string, promptTokens = 0): ModelPrice | undefined {
    const tier = this.tiers
      .get(this.normalize(model))
      ?.find(
        (candidate) => !candidate.maxPromptTokens || promptTokens <= candidate.maxPromptTokens,
      );

    return (
      tier && {
        inputPerMillionTokens: tier.inputPerMillionTokens,
        outputPerMillionTokens: tier.outputPerMillionTokens,
      }
    );
  }

  /** Custo estimado de uma resposta; 0 para modelo fora do catálogo. */
  cost(model: string, inputTokens: number, outputTokens: number): number {
    const price = this.price(model, inputTokens);

    if (!price) {
      return 0;
    }

    return (
      (inputTokens / 1_000_000) * price.inputPerMillionTokens +
      (outputTokens / 1_000_000) * price.outputPerMillionTokens
    );
  }

  /** Modelos do mais barato ao mais caro (entrada + saída, faixa de prompt curto). */
  byCost(): string[] {
    const total = (model: string) => {
      const price = this.price(model);

      return price ? price.inputPerMillionTokens + price.outputPerMillionTokens : Infinity;
    };

    return [...this.tiers.keys()].sort((a, b) => total(a) - total(b) || a.localeCompare(b));
  }

  /** Modelo mais barato do catálogo. */
  cheapest(): string {
    return this.byCost()[0] ?? '';
  }

  /** Posição do modelo na ordem do mais barato ao mais caro (para ordenar listas vindas da API). */
  rank(model: string): number {
    return this.byCost().indexOf(this.normalize(model));
  }
}
