import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { EventPublisher } from '../ipc/event-publisher';
import type { FilePicker } from '../ipc/file-picker';
import {
  BACKUP_ITEM_IDS,
  type BackupCreateRequest,
  type BackupCreateResult,
  type BackupInspection,
  type BackupItemId,
  type BackupItemPreview,
  type BackupPreview,
  type BackupRestoreItemResult,
  type BackupRestoreRequest,
  type BackupRestoreResult,
  type RecordImportResult,
  type RestoreMode,
} from '../shared/contracts/backup';
import type { SettingsData, SettingsPatch } from '../shared/contracts/settings';
import { IpcError, IpcErrorCode } from '../shared/errors';
import { IpcEvents } from '../shared/events';
import {
  copyTree,
  reasonOf,
  scanTree,
  throttleProgress,
  type ProgressListener,
} from '../storage/tree';

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  FILE_ITEMS,
  FOLDER_ITEMS,
  ITEM_KINDS,
  MANIFEST_ENTRY,
  NOT_INCLUDED,
  itemOfEntry,
  parseManifest,
  validateEntries,
  type BackupManifest,
  type ManifestItem,
} from './manifest';
import {
  extractZip,
  isAbortError,
  listZip,
  readZipText,
  writeZip,
  type ZipEntryToWrite,
} from './zip';

export const BackupMessages = {
  nothingSelected: 'Escolha pelo menos um item para o backup.',
  unknownItem: (id: string) => `Item de backup desconhecido: ${id}`,
  notInBackup: (id: string) => `O backup escolhido não tem o item "${id}".`,
  busy: 'Já há um backup ou uma restauração em andamento.',
  chooseAgain: 'Escolha o arquivo de backup de novo.',
  invalidMode: 'Modo de restauração inválido.',
  unreadableItem: (id: string) => `Os dados de "${id}" no backup estão ilegíveis.`,
  cancelled: 'A restauração foi cancelada. Nada foi alterado.',
  undone: 'As alterações feitas até aqui foram desfeitas.',
  restoreFailed: (reason: string) => `Não foi possível restaurar o backup: ${reason}`,
} as const;

export const BACKUP_FILE_FILTERS = [{ name: 'Backup do HomeLab', extensions: ['zip'] }];

/** Uma coleção do app (jobs, chats, consumo) que sabe se exportar e receber registros de um backup. */
export interface BackupCollection {
  export(): unknown[];
  import(items: unknown[], mode: RestoreMode): RecordImportResult;
}

export interface BackupSettingsPort {
  get(): SettingsData;
  update(patch: SettingsPatch): unknown;
}

export interface BackupDeps {
  appVersion: string;
  /** Pasta de temporários (`<raiz>/temp`): área de extração e cópias de segurança. Nunca entra no backup. */
  tempDir: string;
  libraryDir: () => string;
  inboxDir: () => string;
  collections: { jobs: BackupCollection; chats: BackupCollection; usage: BackupCollection };
  settings: BackupSettingsPort;
  /** Reconstrói o índice da biblioteca depois de trocar arquivos. */
  reindexLibrary: () => Promise<unknown>;
  filePicker: FilePicker;
  events: EventPublisher;
  now?: () => Date;
}

/** Quanto cada tipo de arquivo costuma encolher no zip (só para a estimativa mostrada ao usuário). */
const TEXT_RATIO = 0.3;
const BINARY_RATIO = 1;
const OTHER_RATIO = 0.7;
const JSON_RATIO = 0.2;
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.txt', '.csv', '.html', '.xml', '.svg', '.yml']);
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.zip',
  '.mp3',
  '.mp4',
  '.mkv',
  '.pdf',
]);

/** Estimativa do tamanho de um arquivo dentro do zip. */
export function estimateZipBytes(relativePath: string, size: number): number {
  const extension = path.extname(relativePath).toLowerCase();
  const ratio = TEXT_EXTENSIONS.has(extension)
    ? TEXT_RATIO
    : BINARY_EXTENSIONS.has(extension)
      ? BINARY_RATIO
      : OTHER_RATIO;

  return Math.ceil(size * ratio);
}

/** Ordem em que a restauração aplica os itens: configurações e coleções antes dos arquivos. */
const RESTORE_ORDER: readonly BackupItemId[] = [
  'settings',
  'usage',
  'jobs',
  'chats',
  'inbox',
  'library',
];

const pad = (value: number) => String(value).padStart(2, '0');

const dayStamp = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const timeStamp = (date: Date) =>
  `${dayStamp(date)}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

/**
 * Backup e restauração em um único `.zip`, nas Configurações. Criar escreve por streaming, com
 * progresso e cancelamento (nunca deixa um zip pela metade). Restaurar lê o manifesto, mostra o
 * conteúdo, extrai para uma pasta temporária, valida e só então aplica (mesclar ou substituir); se
 * algo falhar no meio, **desfaz** o que já tinha aplicado. Segredos e temporários nunca entram.
 */
export class BackupService {
  private running: AbortController | null = null;
  private opened: { token: string; file: string } | null = null;

  constructor(private readonly deps: BackupDeps) {}

  /** O que dá para incluir (com tamanhos e estimativa do zip) e o que não entra. */
  async preview(): Promise<BackupPreview> {
    const items = await Promise.all(BACKUP_ITEM_IDS.map((id) => this.previewItem(id)));

    return { items, notIncluded: [...NOT_INCLUDED] };
  }

  /** Cancela o backup ou a restauração em andamento (na restauração, só até antes de aplicar). */
  cancel(): void {
    this.running?.abort();
  }

  async create(request: BackupCreateRequest): Promise<BackupCreateResult> {
    const items = this.normalizeItems(request.items);

    if (this.running) {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.busy);
    }

    const destination = await this.deps.filePicker.pickSavePath({
      defaultPath: `homelab-backup-${dayStamp(this.now())}.zip`,
      filters: BACKUP_FILE_FILTERS,
    });

    if (!destination) {
      return { cancelled: true };
    }

    const controller = new AbortController();
    const publish = this.progressPublisher();

    this.running = controller;

    try {
      publish({ phase: 'preparing', processed: 0, total: 0 });

      const entries = await this.buildEntries(items);
      const { bytes } = await writeZip(destination, entries, {
        signal: controller.signal,
        onEntry: (name, done, total) =>
          publish({ phase: 'running', processed: done, total, currentFile: name }),
      });

      publish({ phase: 'done', processed: entries.length, total: entries.length });

      return { cancelled: false, path: destination, bytes, files: entries.length };
    } catch (error) {
      if (isAbortError(error)) {
        return { cancelled: true };
      }

      throw error;
    } finally {
      this.running = null;
    }
  }

  /** Pergunta qual zip abrir e devolve o que há nele (lido só do manifesto); `null` se cancelar. */
  async inspect(): Promise<BackupInspection | null> {
    const file = await this.deps.filePicker.pickOpenPath({ filters: BACKUP_FILE_FILTERS });

    if (!file) {
      return null;
    }

    const { manifest } = await this.readBackup(file);
    const token = randomUUID();

    this.opened = { token, file };

    return {
      token,
      fileName: path.basename(file),
      createdAt: manifest.createdAt,
      appVersion: manifest.appVersion,
      items: manifest.items,
    };
  }

  async restore(request: BackupRestoreRequest): Promise<BackupRestoreResult> {
    if (!this.opened || this.opened.token !== request.token) {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.chooseAgain);
    }

    if (request.mode !== 'merge' && request.mode !== 'replace') {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.invalidMode);
    }

    if (this.running) {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.busy);
    }

    const { file } = this.opened;
    const { manifest, entries } = await this.readBackup(file);
    const selected = this.normalizeItems(request.items);

    for (const id of selected) {
      if (!manifest.items.some((item) => item.id === id)) {
        throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.notInBackup(id));
      }
    }

    const controller = new AbortController();
    const publish = this.progressPublisher();
    const stamp = timeStamp(this.now());
    const stage = path.join(this.deps.tempDir, `restore-${stamp}`);
    const safety = path.join(this.deps.tempDir, `safety-${stamp}`);
    const run: RestoreRun = {
      mode: request.mode,
      stage,
      safety,
      undo: [],
      safetyUsed: false,
      restart: false,
    };
    const wanted = new Set(selected);
    let applying = false;

    this.running = controller;

    try {
      publish({ phase: 'preparing', processed: 0, total: 0 });

      const total = entries.filter(
        (entry) => !entry.isDirectory && wanted.has(itemOfEntry(entry.name) as BackupItemId),
      ).length;

      await extractZip(file, stage, {
        signal: controller.signal,
        accept: (name) => wanted.has(itemOfEntry(name) as BackupItemId),
        onEntry: (name, done) =>
          publish({ phase: 'running', processed: done, total, currentFile: name }),
      });

      // a partir daqui os dados do app começam a mudar: não dá mais para cancelar
      applying = true;
      publish({ phase: 'verifying', processed: total, total });

      const results: BackupRestoreItemResult[] = [];

      for (const id of RESTORE_ORDER.filter((item) => wanted.has(item))) {
        results.push(await this.applyItem(id, run));
      }

      if (wanted.has('library') || wanted.has('inbox')) {
        await this.deps.reindexLibrary();
      }

      publish({ phase: 'done', processed: total, total });

      return {
        items: results,
        safetyCopyPath: run.safetyUsed ? safety : null,
        restartRequired: run.restart,
      };
    } catch (error) {
      if (!applying && isAbortError(error)) {
        throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.cancelled);
      }

      const undone = await this.rollback(run);

      if (error instanceof IpcError && error.code === IpcErrorCode.VALIDATION) {
        throw undone
          ? new IpcError(error.code, `${error.message} ${BackupMessages.undone}`)
          : error;
      }

      throw new IpcError(
        IpcErrorCode.PERSIST_FAILED,
        `${BackupMessages.restoreFailed(error instanceof IpcError ? error.message : reasonOf(error))}${undone ? ` ${BackupMessages.undone}` : ''}`,
      );
    } finally {
      await fs.promises.rm(stage, { recursive: true, force: true }).catch(() => undefined);
      this.running = null;
    }
  }

  // ---------- preview e criação ----------

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  private progressPublisher(): ProgressListener {
    return throttleProgress((progress) =>
      this.deps.events.publish(IpcEvents.backupProgress, progress),
    );
  }

  private normalizeItems(items: BackupItemId[]): BackupItemId[] {
    const unique = [...new Set(items ?? [])];

    for (const id of unique) {
      if (!BACKUP_ITEM_IDS.includes(id)) {
        throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.unknownItem(String(id)));
      }
    }

    if (unique.length === 0) {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.nothingSelected);
    }

    return unique;
  }

  private folderOf(id: 'library' | 'inbox'): string {
    return id === 'library' ? this.deps.libraryDir() : this.deps.inboxDir();
  }

  /** Conteúdo (já em objeto) de uma coleção como vai para o zip, e quantos registros ela tem. */
  private collectionPayload(id: Exclude<BackupItemId, 'library' | 'inbox'>): {
    data: unknown;
    count: number;
  } {
    switch (id) {
      case 'jobs': {
        const jobs = this.deps.collections.jobs.export();

        return { data: { version: BACKUP_VERSION, jobs }, count: jobs.length };
      }
      case 'chats': {
        const chats = this.deps.collections.chats.export();

        return { data: { version: BACKUP_VERSION, chats }, count: chats.length };
      }
      case 'usage': {
        const records = this.deps.collections.usage.export();

        return { data: { version: BACKUP_VERSION, records }, count: records.length };
      }
      case 'settings': {
        // sem o caminho da biblioteca (é da máquina) e sem nada que seja segredo
        const { appearance, local } = this.deps.settings.get();

        return { data: { appearance, local: { ollama: local.ollama } }, count: 1 };
      }
    }
  }

  private async previewItem(id: BackupItemId): Promise<BackupItemPreview> {
    if (id === 'library' || id === 'inbox') {
      const scan = await scanTree(this.folderOf(id));

      return {
        id,
        kind: 'files',
        count: scan.files.length,
        bytes: scan.totalBytes,
        estimatedZipBytes: scan.files.reduce(
          (total, file) => total + estimateZipBytes(file.relativePath, file.size),
          0,
        ),
      };
    }

    const { data, count } = this.collectionPayload(id);
    const bytes = Buffer.byteLength(JSON.stringify(data));

    return { id, kind: 'records', count, bytes, estimatedZipBytes: Math.ceil(bytes * JSON_RATIO) };
  }

  /** Monta as entradas do zip (manifesto primeiro) para os itens escolhidos. */
  private async buildEntries(items: BackupItemId[]): Promise<ZipEntryToWrite[]> {
    const entries: ZipEntryToWrite[] = [];
    const manifestItems: ManifestItem[] = [];

    for (const id of items) {
      if (id === 'library' || id === 'inbox') {
        const root = this.folderOf(id);
        const scan = await scanTree(root);

        manifestItems.push({ id, kind: 'files', count: scan.files.length, bytes: scan.totalBytes });

        for (const file of scan.files) {
          entries.push({
            name: `${FOLDER_ITEMS[id]}${file.relativePath}`,
            source: { file: path.join(root, ...file.relativePath.split('/')) },
          });
        }

        continue;
      }

      const { data, count } = this.collectionPayload(id);
      const buffer = Buffer.from(JSON.stringify(data, null, 2), 'utf8');

      manifestItems.push({ id, kind: ITEM_KINDS[id], count, bytes: buffer.length });
      entries.push({ name: FILE_ITEMS[id], source: { buffer } });
    }

    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: this.now().toISOString(),
      appVersion: this.deps.appVersion,
      items: manifestItems,
    };

    return [
      {
        name: MANIFEST_ENTRY,
        source: { buffer: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
      },
      ...entries,
    ];
  }

  // ---------- leitura e restauração ----------

  private async readBackup(file: string) {
    const entries = await listZip(file);
    const manifest = parseManifest(await readZipText(file, MANIFEST_ENTRY));

    validateEntries(entries, manifest);

    return { entries, manifest };
  }

  private async applyItem(id: BackupItemId, run: RestoreRun): Promise<BackupRestoreItemResult> {
    if (id === 'library' || id === 'inbox') {
      return this.applyFolder(id, run);
    }

    if (id === 'settings') {
      return this.applySettings(run);
    }

    return this.applyCollection(id, run);
  }

  private readStaged(id: Exclude<BackupItemId, 'library' | 'inbox'>, run: RestoreRun): unknown {
    const file = path.join(run.stage, ...FILE_ITEMS[id].split('/'));

    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.unreadableItem(id));
    }
  }

  private async applyCollection(
    id: 'jobs' | 'chats' | 'usage',
    run: RestoreRun,
  ): Promise<BackupRestoreItemResult> {
    const key = { jobs: 'jobs', chats: 'chats', usage: 'records' }[id];
    const data = this.readStaged(id, run) as Record<string, unknown> | null;
    const incoming = data?.[key];

    if (!Array.isArray(incoming)) {
      throw new IpcError(IpcErrorCode.VALIDATION, BackupMessages.unreadableItem(id));
    }

    const collection = this.deps.collections[id];
    const previous = collection.export();

    run.undo.push(() => {
      collection.import(previous, 'replace');

      return Promise.resolve();
    });

    if (run.mode === 'replace') {
      await this.keepInSafety(run, FILE_ITEMS[id], previous);
    }

    const { added, skipped } = collection.import(incoming, run.mode);

    return { id, added, skipped };
  }

  private async applySettings(run: RestoreRun): Promise<BackupRestoreItemResult> {
    // mesclar mantém o que está em uso; só substituir troca aparência e Ollama
    if (run.mode === 'merge') {
      return { id: 'settings', added: 0, skipped: 1 };
    }

    const data = this.readStaged('settings', run) as {
      appearance?: SettingsPatch['appearance'];
      local?: { ollama?: { url?: string } };
    } | null;
    const before = this.deps.settings.get();
    const patch: SettingsPatch = {
      ...(data?.appearance ? { appearance: data.appearance } : {}),
      ...(data?.local?.ollama?.url ? { local: { ollama: { url: data.local.ollama.url } } } : {}),
    };

    run.undo.push(() => {
      this.deps.settings.update({
        appearance: before.appearance,
        local: { ollama: before.local.ollama },
      });

      return Promise.resolve();
    });

    await this.keepInSafety(run, FILE_ITEMS.settings, {
      appearance: before.appearance,
      local: { ollama: before.local.ollama },
    });
    this.deps.settings.update(patch);

    run.restart =
      run.restart || this.deps.settings.get().local.ollama.url !== before.local.ollama.url;

    return { id: 'settings', added: 1, skipped: 0 };
  }

  private async applyFolder(
    id: 'library' | 'inbox',
    run: RestoreRun,
  ): Promise<BackupRestoreItemResult> {
    const target = this.folderOf(id);
    const source = path.join(run.stage, id);
    const scan = await scanTree(source);

    if (scan.files.length === 0) {
      return { id, added: 0, skipped: 0 };
    }

    if (run.mode === 'merge') {
      return this.mergeFolder(
        id,
        source,
        target,
        scan.files.map((file) => file.relativePath),
        run,
      );
    }

    const current = await scanTree(target);
    const copy = path.join(run.safety, id);

    if (current.files.length > 0 || current.dirs.length > 0) {
      await copyTree(target, copy);
      run.safetyUsed = true;
    }

    // registra o desfazer ANTES de apagar: se algo falhar daqui em diante, a pasta volta como estava
    run.undo.push(async () => {
      await clearDirectory(target);

      if (fs.existsSync(copy)) {
        await copyTree(copy, target);
      }
    });

    await clearDirectory(target);
    await copyTree(source, target);

    return { id, added: scan.files.length, skipped: 0 };
  }

  /** Mesclar: copia só o que ainda não existe; o que já existe fica como está. */
  private async mergeFolder(
    id: 'library' | 'inbox',
    source: string,
    target: string,
    files: string[],
    run: RestoreRun,
  ): Promise<BackupRestoreItemResult> {
    const added: string[] = [];
    let skipped = 0;

    run.undo.push(async () => {
      for (const file of added) {
        await fs.promises.rm(file, { force: true });
      }
    });

    for (const relative of files) {
      const parts = relative.split('/');
      const destination = path.join(target, ...parts);

      if (fs.existsSync(destination)) {
        skipped += 1;
        continue;
      }

      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      await fs.promises.copyFile(
        path.join(source, ...parts),
        destination,
        fs.constants.COPYFILE_EXCL,
      );
      added.push(destination);
    }

    return { id, added: added.length, skipped };
  }

  /** Guarda na pasta de segurança o que está para ser substituído (coleções e configurações). */
  private async keepInSafety(run: RestoreRun, entry: string, content: unknown): Promise<void> {
    const file = path.join(run.safety, ...entry.split('/'));

    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(content, null, 2), 'utf8');
    run.safetyUsed = true;
  }

  /** Desfaz o que já foi aplicado, do último para o primeiro. Devolve se havia algo a desfazer. */
  private async rollback(run: RestoreRun): Promise<boolean> {
    const actions = [...run.undo].reverse();

    for (const action of actions) {
      try {
        await action();
      } catch {
        // desfazer é no melhor esforço: a cópia de segurança continua na pasta temporária
      }
    }

    return actions.length > 0;
  }
}

interface RestoreRun {
  mode: RestoreMode;
  stage: string;
  safety: string;
  undo: Array<() => Promise<void>>;
  safetyUsed: boolean;
  restart: boolean;
}

/** Apaga o conteúdo da pasta, mantendo a pasta. */
async function clearDirectory(dir: string): Promise<void> {
  let names: string[];

  try {
    names = await fs.promises.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }

    throw error;
  }

  for (const name of names) {
    await fs.promises.rm(path.join(dir, name), { recursive: true, force: true });
  }
}
