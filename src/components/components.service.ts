import * as fs from 'node:fs';
import * as path from 'node:path';

import type { EventPublisher } from '../ipc/event-publisher';
import { extractZip, isAbortError } from '../backup/zip';
import type {
  ComponentInfo,
  ComponentProgress,
  ComponentState,
  ComponentsOverall,
  ComponentsStatus,
  HardwareProfile,
} from '../shared/contracts/components';
import { IpcError, IpcErrorCode } from '../shared/errors';
import { IpcEvents } from '../shared/events';
import type { JsonFile } from '../storage/json-file';

import { COMPONENT_CATALOG, type ComponentSpec } from './component-manifest';
import { downloadVerified, type FetchLike } from './downloader';

export const ComponentMessages = {
  unknown: (id: string) => `Componente desconhecido: ${id}.`,
  notDownloadable: (label: string) => `${label} já vem com o app e não pode ser baixado.`,
  busy: 'Já existe uma instalação em andamento.',
  nothingSelected: 'Escolha ao menos um componente.',
  notRemovable: (label: string) => `${label} é obrigatório e não pode ser removido.`,
  activeModel: 'Este é o modelo em uso. Escolha outro modelo antes de removê-lo.',
  notInstalled: (label: string) => `${label} não está instalado.`,
  noWritePermission: (dir: string) =>
    `Sem permissão para gravar em ${dir}. Instale o app para o seu usuário ou execute como administrador.`,
} as const;

interface PersistedState {
  activeModelId?: string;
}

export interface ComponentsDeps {
  /** Pasta dos binários (`resources/bin/<plataforma>-<arch>`): Whisper, ffmpeg e o pacote CUDA. */
  binDir: string;
  /** Onde os modelos baixados ficam (dentro dos dados do usuário). */
  modelsDir: string;
  /** Onde os downloads do pacote CUDA ficam até serem extraídos. */
  downloadsDir: string;
  platform: NodeJS.Platform;
  state: JsonFile<PersistedState>;
  events: EventPublisher;
  fetchFn: FetchLike;
  hardware: () => Promise<HardwareProfile>;
  catalog?: readonly ComponentSpec[];
}

interface RuntimeEntry {
  state: ComponentState;
  progress: ComponentProgress | null;
  error: string | null;
}

/**
 * Lista de componentes do app: detecta o que está instalado, baixa o que falta (com progresso e
 * checksum), extrai pacotes, remove e guarda qual modelo do Whisper está em uso. Cada componente
 * vem do catálogo (`component-manifest.ts`); acrescentar um item lá basta para ele aparecer.
 */
export class ComponentsService {
  private readonly catalog: readonly ComponentSpec[];
  private readonly runtime = new Map<string, RuntimeEntry>();
  private queue: string[] = [];
  private completed = 0;
  private running: Promise<void> | null = null;
  private abort: AbortController | null = null;
  private profile: HardwareProfile | null = null;

  constructor(private readonly deps: ComponentsDeps) {
    this.catalog = deps.catalog ?? COMPONENT_CATALOG;
  }

  /** Resolve quando a instalação em andamento termina (para testes e para o encerramento do app). */
  whenIdle(): Promise<void> {
    return this.running ?? Promise.resolve();
  }

  async status(): Promise<ComponentsStatus> {
    return this.buildStatus(await this.hardware());
  }

  /** Modelo a passar ao Whisper: caminho completo do modelo ativo, ou o nome padrão se não houver. */
  activeModelRef(fallback: string): string {
    const active = this.activeModelSpec();

    if (!active) {
      return fallback;
    }

    return this.modelLocation(active) ?? fallback;
  }

  async install(ids: string[]): Promise<ComponentsStatus> {
    if (this.running) {
      throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.busy);
    }

    if (ids.length === 0) {
      throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.nothingSelected);
    }

    const specs = ids.map((id) => this.spec(id));

    for (const spec of specs) {
      if (spec.kind === 'bundled') {
        throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.notDownloadable(spec.label));
      }
    }

    await this.assertWritable();

    const pending = specs.filter((spec) => !this.isInstalled(spec)).map((spec) => spec.id);

    this.queue = pending;
    this.completed = 0;
    this.abort = new AbortController();
    this.runtime.clear();

    for (const id of pending) {
      this.runtime.set(id, { state: 'queued', progress: null, error: null });
    }

    await this.hardware();
    this.publish();
    this.running = this.run(pending, this.abort.signal).finally(() => {
      this.running = null;
      this.abort = null;
      this.queue = [];
      this.publish();
    });

    return this.status();
  }

  cancel(): void {
    this.abort?.abort();
  }

  async remove(id: string): Promise<ComponentsStatus> {
    const spec = this.spec(id);

    if (spec.required || spec.kind === 'bundled') {
      throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.notRemovable(spec.label));
    }

    if (this.running) {
      throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.busy);
    }

    if (!this.isInstalled(spec)) {
      throw new IpcError(IpcErrorCode.NOT_FOUND, ComponentMessages.notInstalled(spec.label));
    }

    if (spec.group === 'model' && this.activeModelSpec()?.id === spec.id) {
      throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.activeModel);
    }

    if (spec.kind === 'zip') {
      for (const file of spec.provides ?? []) {
        await fs.promises.rm(path.join(this.deps.binDir, file), { force: true });
      }
    } else {
      await fs.promises.rm(path.join(this.deps.modelsDir, spec.file), { force: true });
    }

    this.runtime.delete(id);

    return this.status();
  }

  async setActiveModel(id: string): Promise<ComponentsStatus> {
    const spec = this.spec(id);

    if (spec.group !== 'model' || !this.isInstalled(spec)) {
      throw new IpcError(IpcErrorCode.NOT_FOUND, ComponentMessages.notInstalled(spec.label));
    }

    this.deps.state.write({ ...(this.deps.state.read() ?? {}), activeModelId: id });
    this.publish();

    return this.status();
  }

  private async run(ids: string[], signal: AbortSignal): Promise<void> {
    for (const id of ids) {
      if (signal.aborted) {
        this.runtime.delete(id);
        continue;
      }

      const spec = this.spec(id);

      try {
        await this.installOne(spec, signal);

        this.runtime.delete(id);
        this.completed += 1;

        if (spec.group === 'model' && !this.activeModelSpec()) {
          this.deps.state.write({ ...(this.deps.state.read() ?? {}), activeModelId: spec.id });
        }
      } catch (error) {
        if (isAbortError(error) || signal.aborted) {
          this.runtime.delete(id);
        } else {
          this.runtime.set(id, {
            state: 'failed',
            progress: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.publish();
    }
  }

  private async installOne(spec: ComponentSpec, signal: AbortSignal): Promise<void> {
    const download = spec.download;

    if (!download) {
      return;
    }

    const destination =
      spec.kind === 'zip'
        ? path.join(this.deps.downloadsDir, `${spec.id}.zip`)
        : path.join(this.deps.modelsDir, spec.file);

    this.setRuntime(spec.id, 'downloading', { receivedBytes: 0, totalBytes: spec.sizeBytes });

    await downloadVerified(this.deps.fetchFn, {
      url: download.url,
      destination,
      sha256: download.sha256,
      expectedBytes: spec.sizeBytes,
      signal,
      onProgress: (receivedBytes, totalBytes) =>
        this.setRuntime(spec.id, 'downloading', { receivedBytes, totalBytes }),
      onVerifying: () => this.setRuntime(spec.id, 'verifying', null),
    });

    if (spec.kind === 'zip') {
      this.setRuntime(spec.id, 'installing', null);

      try {
        await extractZip(destination, this.deps.binDir, { signal });
      } finally {
        await fs.promises.rm(destination, { force: true });
      }
    }
  }

  private setRuntime(id: string, state: ComponentState, progress: ComponentProgress | null): void {
    this.runtime.set(id, { state, progress, error: null });
    this.publish();
  }

  private async assertWritable(): Promise<void> {
    for (const dir of [this.deps.modelsDir, this.deps.downloadsDir, this.deps.binDir]) {
      try {
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.access(dir, fs.constants.W_OK);
      } catch {
        throw new IpcError(IpcErrorCode.PERSIST_FAILED, ComponentMessages.noWritePermission(dir));
      }
    }
  }

  private spec(id: string): ComponentSpec {
    const spec = this.catalog.find((candidate) => candidate.id === id);

    if (!spec) {
      throw new IpcError(IpcErrorCode.VALIDATION, ComponentMessages.unknown(id));
    }

    return spec;
  }

  private async hardware(): Promise<HardwareProfile> {
    this.profile ??= await this.deps.hardware();

    return this.profile;
  }

  private publish(): void {
    if (!this.profile) {
      return;
    }

    this.deps.events.publish(IpcEvents.componentsProgress, this.buildStatus(this.profile));
  }

  private exe(name: string): string {
    return this.deps.platform === 'win32' && !name.includes('.') ? `${name}.exe` : name;
  }

  private modelLocation(spec: ComponentSpec): string | null {
    const candidates = [
      path.join(this.deps.modelsDir, spec.file),
      path.join(this.deps.binDir, spec.file),
    ];

    return candidates.find((file) => fs.existsSync(file)) ?? null;
  }

  private isInstalled(spec: ComponentSpec): boolean {
    if (spec.kind === 'bundled') {
      return fs.existsSync(path.join(this.deps.binDir, this.exe(spec.file)));
    }

    if (spec.kind === 'zip') {
      return (spec.provides ?? [spec.file]).every((file) =>
        fs.existsSync(path.join(this.deps.binDir, file)),
      );
    }

    return this.modelLocation(spec) !== null;
  }

  /** Modelo ativo: o escolhido (se ainda existe) ou o primeiro instalado, na ordem do catálogo. */
  private activeModelSpec(): ComponentSpec | null {
    const models = this.catalog.filter((spec) => spec.group === 'model' && this.isInstalled(spec));
    const chosen = this.deps.state.read()?.activeModelId;

    return models.find((spec) => spec.id === chosen) ?? models[0] ?? null;
  }

  private overall(): ComponentsOverall | null {
    if (!this.running) {
      return null;
    }

    const specs = this.queue.map((id) => this.spec(id));
    const totalBytes = specs.reduce((sum, spec) => sum + spec.sizeBytes, 0);
    const doneBytes = specs
      .filter((spec) => !this.runtime.has(spec.id))
      .reduce((sum, spec) => sum + spec.sizeBytes, 0);
    const current = [...this.runtime.values()].reduce(
      (sum, entry) => sum + (entry.progress?.receivedBytes ?? 0),
      0,
    );

    return {
      total: specs.length,
      done: this.completed,
      receivedBytes: Math.min(doneBytes + current, totalBytes),
      totalBytes,
    };
  }

  private buildStatus(hardware: HardwareProfile): ComponentsStatus {
    const active = this.activeModelSpec();
    const recommended = new Set(hardware.recommendation.componentIds);
    const components: ComponentInfo[] = this.catalog.map((spec) => {
      const entry = this.runtime.get(spec.id);
      const installed = this.isInstalled(spec);

      return {
        id: spec.id,
        group: spec.group,
        label: spec.label,
        description: spec.description,
        required: spec.required,
        bundled: spec.kind === 'bundled',
        sizeBytes: spec.sizeBytes,
        state: entry?.state ?? (installed ? 'installed' : 'missing'),
        progress: entry?.progress ?? null,
        error: entry?.error ?? null,
        recommended: recommended.has(spec.id),
        active: active?.id === spec.id,
      };
    });

    const missingRequired = this.catalog.some((spec) => spec.required && !this.isInstalled(spec));
    const anyModel = this.catalog.some((spec) => spec.group === 'model' && this.isInstalled(spec));

    return {
      components,
      hardware,
      running: this.running !== null,
      overall: this.overall(),
      needsSetup: missingRequired || !anyModel,
    };
  }
}
