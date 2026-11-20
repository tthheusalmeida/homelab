import { Injectable, Optional } from '@nestjs/common';

import { JsonFile } from '../../../../storage/json-file';
import { BackAlerts } from '../../../config/back-alerts';
import { BackConfig } from '../../../config/back-config';

import type { StoredInfographic } from '../domain/infographic';

interface InfographicsFileData {
  version: 1;
  /** Por id da página. */
  infographics: Record<string, StoredInfographic>;
}

/**
 * Infográficos gerados, um por página, em `data/infographics.json` (sem arquivo no `BackConfig`, só
 * em memória, como nos testes). Fica guardado em disco como o mapa mental: a IA roda quando o
 * usuário pede, e o resultado volta a abrir depois sem gerar de novo.
 */
@Injectable()
export class InfographicStore {
  private readonly file: JsonFile<InfographicsFileData> | null;

  private items: Record<string, StoredInfographic> | null = null;

  constructor(
    @Optional() config?: BackConfig,
    @Optional() private readonly alerts?: BackAlerts,
  ) {
    this.file = config?.infographicsFile
      ? new JsonFile<InfographicsFileData>(config.infographicsFile)
      : null;
  }

  get(id: string): StoredInfographic | undefined {
    return this.load()[id];
  }

  set(id: string, infographic: StoredInfographic): void {
    this.load()[id] = infographic;
    this.save();
  }

  delete(id: string): void {
    if (id in this.load()) {
      delete this.load()[id];
      this.save();
    }
  }

  private load(): Record<string, StoredInfographic> {
    if (this.items) {
      return this.items;
    }

    try {
      const data = this.file?.read();

      this.items =
        data && typeof data.infographics === 'object' && data.infographics !== null
          ? { ...data.infographics }
          : {};
    } catch {
      // ilegível (e sem cópia boa): começa vazio; os infográficos são gerados de novo quando pedidos
      this.items = {};
    }

    return this.items;
  }

  private save(): void {
    try {
      this.file?.write({ version: 1, infographics: this.load() });
    } catch (error) {
      // o infográfico segue valendo em memória; o usuário precisa saber que não ficou em disco
      this.alerts?.persistFailed(
        'os infográficos',
        error instanceof Error ? error.message : 'erro desconhecido',
      );
    }
  }
}
