import { Injectable, Optional } from '@nestjs/common';

import type { RecordImportResult, RestoreMode } from '../../../../shared/contracts/backup';
import { JsonFile } from '../../../../storage/json-file';
import { BackAlerts } from '../../../config/back-alerts';
import { BackConfig } from '../../../config/back-config';

import type { StoredMindMap } from '../domain/mind-map';

interface MindMapsFileData {
  version: 1;
  /** Por id da página. */
  maps: Record<string, StoredMindMap>;
}

function isStoredEntry(value: unknown): value is { id: string; map: StoredMindMap } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { id, map } = value as { id?: unknown; map?: Partial<StoredMindMap> | null };

  return (
    typeof id === 'string' &&
    id !== '' &&
    typeof map === 'object' &&
    map !== null &&
    Array.isArray(map.nodes) &&
    typeof map.createdAt === 'string'
  );
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

  /** Todos os mapas, um por página, como lista (usado pelo backup). */
  exportAll(): Array<{ id: string; map: StoredMindMap }> {
    return Object.entries(this.load()).map(([id, map]) => ({ id, map: structuredClone(map) }));
  }

  /**
   * Traz mapas de um backup. `merge` só adiciona os de páginas que ainda não têm mapa (mantém o
   * atual, com as edições do usuário); `replace` troca todos. Ignora entradas inválidas.
   */
  importAll(raw: unknown[], mode: RestoreMode): RecordImportResult {
    const incoming = raw.filter(isStoredEntry);
    const current = this.load();
    const base: Record<string, StoredMindMap> = mode === 'replace' ? {} : { ...current };
    let added = 0;

    for (const { id, map } of incoming) {
      if (!(id in base)) {
        base[id] = map;
        added += 1;
      }
    }

    this.maps = base;
    this.save();

    return { added, skipped: raw.length - added };
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
