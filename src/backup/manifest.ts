import {
  BACKUP_ITEM_IDS,
  type BackupExclusionId,
  type BackupItemId,
  type BackupItemKind,
} from '../shared/contracts/backup';
import { IpcError, IpcErrorCode } from '../shared/errors';

import type { ZipEntryInfo } from './zip';

export const BACKUP_FORMAT = 'homelab-backup';
export const BACKUP_VERSION = 1;
export const MANIFEST_ENTRY = 'manifest.json';

/** Onde cada item mora dentro do zip: pastas para arquivos, um arquivo para cada coleção. */
export const FOLDER_ITEMS = { library: 'library/', inbox: 'inbox/' } as const;
export const FILE_ITEMS = {
  jobs: 'data/jobs.json',
  chats: 'data/chats.json',
  mindMaps: 'data/mind-maps.json',
  infographics: 'data/infographics.json',
  usage: 'data/ai-usage.json',
  settings: 'config/settings.json',
} as const;

export const ITEM_KINDS: Record<BackupItemId, BackupItemKind> = {
  library: 'files',
  inbox: 'files',
  jobs: 'records',
  chats: 'records',
  mindMaps: 'records',
  infographics: 'records',
  usage: 'records',
  settings: 'records',
};

/** Tudo o que **não** vai para o zip: a tela mostra esta lista antes de criar o backup. */
export const NOT_INCLUDED: readonly BackupExclusionId[] = [
  'secrets',
  'temp',
  'ai-binaries',
  'preferences',
  'library-path',
];

export const ManifestMessages = {
  notManifest: 'Este arquivo não é um backup do HomeLab (o manifesto está ausente ou ilegível).',
  tooNew:
    'Este backup foi criado por uma versão mais nova do HomeLab. Atualize o app para restaurá-lo.',
  unknownEntry: (name: string) => `O backup contém um arquivo inesperado: ${name}`,
  missingItem: (id: string) => `O backup diz ter "${id}", mas os arquivos não estão no zip.`,
} as const;

export interface ManifestItem {
  id: BackupItemId;
  kind: BackupItemKind;
  /** Arquivos (itens de pasta) ou registros (coleções). */
  count: number;
  /** Tamanho original, em bytes. */
  bytes: number;
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  appVersion: string;
  items: ManifestItem[];
}

/** Item a que uma entrada do zip pertence; `null` se ela não é de nenhum item conhecido. */
export function itemOfEntry(name: string): BackupItemId | 'manifest' | null {
  if (name === MANIFEST_ENTRY) {
    return 'manifest';
  }

  for (const [id, prefix] of Object.entries(FOLDER_ITEMS)) {
    if (name.startsWith(prefix) && name.length > prefix.length) {
      return id as BackupItemId;
    }
  }

  for (const [id, entry] of Object.entries(FILE_ITEMS)) {
    if (name === entry) {
      return id as BackupItemId;
    }
  }

  return null;
}

const isItemId = (value: unknown): value is BackupItemId =>
  typeof value === 'string' && (BACKUP_ITEM_IDS as readonly string[]).includes(value);

/** Lê e valida o `manifest.json`. Backup de versão futura é recusado com mensagem clara. */
export function parseManifest(text: string | null): BackupManifest {
  let data: Partial<BackupManifest> | null = null;

  try {
    data = text === null ? null : (JSON.parse(text) as Partial<BackupManifest>);
  } catch {
    data = null;
  }

  if (
    !data ||
    data.format !== BACKUP_FORMAT ||
    typeof data.version !== 'number' ||
    !Array.isArray(data.items)
  ) {
    throw new IpcError(IpcErrorCode.VALIDATION, ManifestMessages.notManifest);
  }

  if (data.version > BACKUP_VERSION) {
    throw new IpcError(IpcErrorCode.VALIDATION, ManifestMessages.tooNew);
  }

  const items: ManifestItem[] = data.items
    .filter(
      (item): item is ManifestItem =>
        isItemId(item?.id) && typeof item.count === 'number' && typeof item.bytes === 'number',
    )
    .map((item) => ({
      id: item.id,
      kind: ITEM_KINDS[item.id],
      count: item.count,
      bytes: item.bytes,
    }));

  return {
    format: BACKUP_FORMAT,
    version: data.version,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : '',
    items,
  };
}

/** Pastas de primeiro nível aceitas no zip (entradas de pasta de outros programas de zip). */
const TOP_FOLDERS = new Set(['library', 'inbox', 'data', 'config']);

/**
 * Confere o conteúdo do zip com o manifesto: nenhum arquivo fora do conjunto conhecido e todo item
 * anunciado tem seus arquivos. Qualquer coisa fora disso torna o backup inválido.
 */
export function validateEntries(entries: ZipEntryInfo[], manifest: BackupManifest): void {
  const present = new Set<BackupItemId>();

  for (const entry of entries) {
    const item = itemOfEntry(entry.name);

    if (item === null) {
      if (entry.isDirectory && TOP_FOLDERS.has(entry.name.split('/')[0])) {
        continue;
      }

      throw new IpcError(IpcErrorCode.VALIDATION, ManifestMessages.unknownEntry(entry.name));
    }

    if (item !== 'manifest') {
      present.add(item);
    }
  }

  for (const item of manifest.items) {
    // coleções sempre têm o seu arquivo; pastas só precisam dele se o manifesto diz que há arquivos
    if ((item.kind === 'records' || item.count > 0) && !present.has(item.id)) {
      throw new IpcError(IpcErrorCode.VALIDATION, ManifestMessages.missingItem(item.id));
    }
  }
}
