import { Injectable } from '@nestjs/common';

import { contextBudget } from '../../../../shared/rag-budget';
import { isFollowUp } from '../domain/follow-up';
import type { RagHit } from '../domain/rag.types';

import { RagSearchService } from './rag-search.service';

/** O trecho precisa conter pelo menos esta fração das palavras úteis da pergunta. */
export const MIN_COVERAGE = 0.5;
/**
 * Sem as palavras da pergunta, o trecho entra se o sentido dele é próximo o bastante (busca por
 * vetores). Medido com o modelo de vetores em português: trechos do assunto ficam entre 0,35 e 0,52
 * e o que não tem a ver ("capital da França") não passa de 0,27.
 */
export const MIN_SIMILARITY = 0.33;
/** E pontuar pelo menos esta fração do melhor trecho (corta o "fundo da fila"; só na busca por palavras). */
export const MIN_RELATIVE_SCORE = 0.35;

export interface RetrieveOptions {
  /** Janela de contexto do modelo, em tokens: define quantos trechos acompanham a pergunta. */
  contextLimit?: number;
  /** Tamanho do modelo em bilhões de parâmetros: modelo pequeno recebe menos trechos. */
  modelBillions?: number;
}

/**
 * Escolhe os trechos das páginas que acompanham a pergunta do chat. Decide **se** há contexto
 * (pergunta fora do assunto das páginas não recebe nenhum, nem vira referência) e **quais** trechos
 * entram, e quantos cabem conforme a janela do modelo (`contextBudget`). A busca em si é do
 * `RagSearchService`.
 */
@Injectable()
export class RagContextService {
  constructor(private readonly search: RagSearchService) {}

  /**
   * @param question a pergunta
   * @param previousQuestion a pergunta anterior do mesmo chat, usada só quando a atual é uma
   *   continuação ("e a segunda?"), nunca quando tem assunto próprio ("e sobre DevOps?")
   */
  async retrieve(
    question: string,
    previousQuestion?: string,
    options: RetrieveOptions = {},
  ): Promise<RagHit[]> {
    const budget = contextBudget(options.contextLimit, options.modelBillions);
    const query =
      previousQuestion && isFollowUp(question) ? `${previousQuestion} ${question}` : question;

    const { hits, semantic } = await this.search.search(query, budget.maxHits * 2);
    const top = hits[0]?.score ?? 0;
    const picked: RagHit[] = [];
    let chars = 0;

    for (const hit of hits) {
      if (!this.isRelevant(hit, top, semantic)) {
        continue;
      }

      if (
        picked.length >= budget.maxHits ||
        (picked.length > 0 && chars + hit.text.length > budget.maxChars)
      ) {
        break;
      }

      picked.push(hit);
      chars += hit.text.length;
    }

    return picked;
  }

  /**
   * Só palavras: o trecho precisa ter a maioria das palavras da pergunta e pontuar perto do melhor.
   * Com busca por sentido, entra também quem tem a maioria das palavras **ou** sentido próximo (a
   * pontuação das duas listas juntas não serve de régua).
   */
  private isRelevant(hit: RagHit, top: number, semantic: boolean): boolean {
    if (!semantic) {
      return hit.coverage >= MIN_COVERAGE && hit.score >= top * MIN_RELATIVE_SCORE;
    }

    return hit.coverage >= MIN_COVERAGE || (hit.similarity ?? 0) >= MIN_SIMILARITY;
  }
}
