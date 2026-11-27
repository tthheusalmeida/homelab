/**
 * Índice de busca por palavras (BM25), em memória. Para cada termo guarda em quais trechos ele
 * aparece e quantas vezes. A pontuação premia termo raro (achar "devop" diz mais que achar "app")
 * e penaliza trecho muito longo, e isso é medido **só no corpo** do trecho. O que aparece no
 * título da página e nos cabeçalhos entra como **bônus somado**, sem esticar nem encolher o
 * tamanho: assim um trecho curto que só repete o título não ganha de quem explica o assunto.
 */

/** Termos (já analisados) de um trecho, separados por onde aparecem. */
export interface IndexedFields {
  title: string[];
  headings: string[];
  body: string[];
}

/** Um termo da pergunta e as formas aceitas para ele (a original e as corrigidas), com peso. */
export interface QueryTerm {
  alternatives: Array<{ term: string; weight: number }>;
}

export interface Bm25Match {
  id: string;
  score: number;
  /** Quantos termos da pergunta o trecho contém (de qualquer forma aceita). */
  matchedTerms: number;
}

const K1 = 1.2;
const B = 0.75;
/** Bônus (em múltiplos do valor do termo) quando o termo está nos cabeçalhos ou no título. */
const HEADING_BONUS = 0.6;
const TITLE_BONUS = 0.3;
/** Bônus por par de palavras da pergunta que aparece junto e na mesma ordem ("primeira maneira"). */
const PHRASE_BONUS = 0.3;
const MAX_PHRASE_BONUS = 0.6;

export class Bm25Index {
  private readonly ids: string[] = [];
  /** Tamanho do corpo de cada trecho. */
  private readonly lengths: number[] = [];
  /** Palavras de cada trecho em ordem (cabeçalhos e corpo), para achar pares juntos. */
  private readonly sequences: string[][] = [];
  /** termo → (posição do trecho → quantas vezes está no corpo). */
  private readonly body = new Map<string, Map<number, number>>();
  /** termo → posições dos trechos que o têm nos cabeçalhos / no título da página. */
  private readonly inHeadings = new Map<string, Set<number>>();
  private readonly inTitle = new Map<string, Set<number>>();
  /** termo → em quantos trechos aparece em qualquer lugar. */
  private readonly documentFrequency = new Map<string, number>();
  private totalLength = 0;

  get size(): number {
    return this.ids.length;
  }

  add(id: string, fields: IndexedFields): void {
    const position = this.ids.length;
    const frequencies = new Map<string, number>();

    for (const term of fields.body) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }

    for (const [term, frequency] of frequencies) {
      addTo(this.body, term, position, frequency);
    }

    fields.headings.forEach((term) => addToSet(this.inHeadings, term, position));
    fields.title.forEach((term) => addToSet(this.inTitle, term, position));

    for (const term of new Set([...fields.title, ...fields.headings, ...fields.body])) {
      this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
    }

    this.ids.push(id);
    this.sequences.push([...fields.headings, ...fields.body]);
    this.lengths.push(fields.body.length);
    this.totalLength += fields.body.length;
  }

  /** Quantos trechos têm cada termo: é o vocabulário que a correção de digitação consulta. */
  vocabulary(): Map<string, number> {
    return new Map(this.documentFrequency);
  }

  search(query: QueryTerm[], limit: number): Bm25Match[] {
    if (this.size === 0 || query.length === 0) {
      return [];
    }

    const averageLength = this.totalLength / this.size || 1;
    const scores = new Map<number, number>();
    const matched = new Map<number, Set<number>>();

    const credit = (position: number, queryIndex: number, value: number): void => {
      scores.set(position, (scores.get(position) ?? 0) + value);

      const terms = matched.get(position) ?? new Set<number>();

      terms.add(queryIndex);
      matched.set(position, terms);
    };

    query.forEach((queryTerm, queryIndex) => {
      for (const { term, weight } of queryTerm.alternatives) {
        const documents = this.documentFrequency.get(term) ?? 0;

        if (documents === 0) {
          continue;
        }

        const idf = Math.log(1 + (this.size - documents + 0.5) / (documents + 0.5));

        for (const [position, frequency] of this.body.get(term) ?? []) {
          const norm = 1 - B + (B * this.lengths[position]) / averageLength;

          credit(
            position,
            queryIndex,
            ((idf * (frequency * (K1 + 1))) / (frequency + K1 * norm)) * weight,
          );
        }

        for (const position of this.inHeadings.get(term) ?? []) {
          credit(position, queryIndex, idf * HEADING_BONUS * weight);
        }

        for (const position of this.inTitle.get(term) ?? []) {
          credit(position, queryIndex, idf * TITLE_BONUS * weight);
        }
      }
    });

    const pairs = adjacentPairs(query);

    return [...scores]
      .map(([position, score]): Bm25Match => {
        const found = matched.get(position)?.size ?? 0;
        const coverage = 0.5 + (0.5 * found) / query.length;
        const phrase = Math.min(
          MAX_PHRASE_BONUS,
          PHRASE_BONUS * pairs.filter((pair) => this.hasPair(position, pair)).length,
        );

        return {
          id: this.ids[position],
          score: score * coverage * (1 + phrase),
          matchedTerms: found,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** O trecho tem as duas palavras coladas e na mesma ordem (aceita qualquer forma corrigida)? */
  private hasPair(position: number, [first, second]: [Set<string>, Set<string>]): boolean {
    const sequence = this.sequences[position];

    for (let i = 0; i < sequence.length - 1; i += 1) {
      if (first.has(sequence[i]) && second.has(sequence[i + 1])) {
        return true;
      }
    }

    return false;
  }
}

function addTo(
  map: Map<string, Map<number, number>>,
  term: string,
  position: number,
  value: number,
): void {
  const list = map.get(term) ?? new Map<number, number>();

  list.set(position, value);
  map.set(term, list);
}

function addToSet(map: Map<string, Set<number>>, term: string, position: number): void {
  const set = map.get(term) ?? new Set<number>();

  set.add(position);
  map.set(term, set);
}

function adjacentPairs(query: QueryTerm[]): Array<[Set<string>, Set<string>]> {
  const forms = query.map((queryTerm) => new Set(queryTerm.alternatives.map(({ term }) => term)));

  return forms.slice(1).map((form, index): [Set<string>, Set<string>] => [forms[index], form]);
}
