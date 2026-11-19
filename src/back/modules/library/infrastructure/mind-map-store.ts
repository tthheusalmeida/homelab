import { Injectable, Optional } from '@nestjs/common';

import { JsonFile } from '../../../../storage/json-file';
import { BackAlerts } from '../../../config/back-alerts';
import { BackConfig } from '../../../config/back-config';

import type { StoredMindMap } from '../domain/mind-map';

interface MindMapsFileData {
  version: 1;
  /** Por id da página. */
  maps: Record<string, StoredMindMap>;
}

/**
 * Mapas mentais gerados, um por página, em `data/mind-maps.json` (sem arquivo no `BackConfig`, só
 * em memória, como nos testes). É um cache: se o arquivo se perder, o mapa é gerado de novo.
 */
@Injectable()
export class MindMapStore {
  private readonly file: JsonFile<MindMapsFileData> | null;

  private maps: Record<string, StoredMindMap> | null = null;

  constructor(
    @Optional() config?: BackConfig,
    @Optional() private readonly alerts?: BackAlerts,
  ) {
    this.file = config?.mindMapsFile ? new JsonFile<MindMapsFileData>(config.mindMapsFile) : null;
  }

  get(id: string): StoredMindMap | undefined {
    return this.load()[id];
  }

  set(id: string, map: StoredMindMap): void {
    this.load()[id] = map;
    this.save();
  }

  delete(id: string): void {
    if (id in this.load()) {
      delete this.load()[id];
      this.save();
    }
  }

  private load(): Record<string, StoredMindMap> {
    if (this.maps) {
      return this.maps;
    }

    try {
      const data = this.file?.read();

      this.maps =
        data && typeof data.maps === 'object' && data.maps !== null ? { ...data.maps } : {};
    } catch {
      // ilegível (e sem cópia boa): começa vazio; os mapas são gerados de novo quando pedidos
      this.maps = {};
    }

    return this.maps;
  }

  private save(): void {
    try {
      this.file?.write({ version: 1, maps: this.load() });
    } catch (error) {
      // o mapa segue valendo em memória; o usuário precisa saber que não ficou em disco
      this.alerts?.persistFailed(
        'os mapas mentais',
        error instanceof Error ? error.message : 'erro desconhecido',
      );
    }
  }
}
