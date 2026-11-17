import { DownloadMessages } from '../components/downloader';
import type { UpdateRelease, UpdateState, UpdateStatus } from '../shared/contracts/updates';

import type { InstallerAsset, LatestRelease } from './release-source';
import { isNewerVersion } from './version';

export const UpdateMessages = {
  checkFailed: 'Não foi possível verificar as atualizações. Confira a conexão e tente de novo.',
  installFailed: 'Não foi possível baixar a atualização. Tente de novo.',
  noInstaller: 'Esta versão ainda não tem instalador para o seu sistema.',
  noChecksum: 'Esta versão não traz a verificação de integridade, então não foi aplicada.',
  notifyTitle: 'Atualização do HomeLab disponível',
  notifyBody: (version: string) =>
    `A versão ${version} já pode ser instalada. Abra as Configurações.`,
} as const;

/** Primeira verificação, logo depois do app abrir (não disputa a abertura). */
export const FIRST_CHECK_DELAY_MS = 15_000;
/** Depois, de tempos em tempos enquanto o app fica aberto. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface UpdateSource {
  latest(): Promise<LatestRelease | null>;
}

export interface UpdaterTimers {
  setTimeout(run: () => void, ms: number): unknown;
  setInterval(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface AppUpdaterDeps {
  currentVersion: string;
  /** O app aplica a atualização sozinho (Windows)? Se não, só leva ao Release no navegador. */
  canInstall: boolean;
  source: UpdateSource;
  /** Baixa e confere o instalador; devolve o caminho do arquivo. `onProgress` recebe 0 a 100. */
  download(
    asset: InstallerAsset & { sha256: string },
    onProgress: (percent: number) => void,
  ): Promise<string>;
  /** Abre o instalador e fecha o app para a troca. */
  launchInstaller(file: string): void | Promise<void>;
  /** Avisa as janelas que o estado mudou. */
  publish(status: UpdateStatus): void;
  /** Notificação do sistema (só aparece com o app em segundo plano). */
  notifyAvailable(title: string, body: string): void;
  openExternal(url: string): void;
  now(): number;
  timers?: UpdaterTimers;
}

const realTimers: UpdaterTimers = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  setInterval: (run, ms) => setInterval(run, ms),
  clear: (handle) => clearTimeout(handle as NodeJS.Timeout),
};

const HTTP_MESSAGE = /^O servidor respondeu \d+ /;

/**
 * Só as mensagens do downloader (já em português e sem jargão) chegam ao usuário; erro de disco ou
 * de sistema vira a mensagem genérica.
 */
function friendlyMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message;

  if (typeof message !== 'string') {
    return UpdateMessages.installFailed;
  }

  const known =
    message === DownloadMessages.noBody ||
    message === DownloadMessages.checksum ||
    message === DownloadMessages.incomplete ||
    HTTP_MESSAGE.test(message);

  return known ? message : UpdateMessages.installFailed;
}

/**
 * Atualização do app. Verifica o GitHub ao abrir e a cada 6 horas, avisa quando há versão nova e,
 * só quando o usuário pede, baixa o instalador (conferido por checksum) e o aplica. Falha de rede
 * nunca derruba nada: vira uma mensagem no estado. Não importa o Electron (tudo é injetado).
 */
export class AppUpdater {
  private state: UpdateState = 'idle';
  private latest: UpdateRelease | null = null;
  private installer: InstallerAsset | null = null;
  private progress = 0;
  private error: string | null = null;
  private checkedAt: number | null = null;
  private notifiedVersion: string | null = null;
  private handles: unknown[] = [];

  constructor(private readonly deps: AppUpdaterDeps) {}

  status(): UpdateStatus {
    return {
      state: this.state,
      currentVersion: this.deps.currentVersion,
      latest: this.latest,
      progress: this.progress,
      error: this.error,
      checkedAt: this.checkedAt,
      canInstall: this.deps.canInstall,
    };
  }

  /** Agenda a verificação de abertura e as periódicas. */
  start(): void {
    const timers = this.deps.timers ?? realTimers;
    const run = () => void this.check();

    this.handles = [
      timers.setTimeout(run, FIRST_CHECK_DELAY_MS),
      timers.setInterval(run, CHECK_INTERVAL_MS),
    ];
  }

  stop(): void {
    const timers = this.deps.timers ?? realTimers;

    this.handles.forEach((handle) => timers.clear(handle));
    this.handles = [];
  }

  async check(): Promise<UpdateStatus> {
    if (this.busy()) {
      return this.status();
    }

    const previous = this.state;

    this.set('checking', { error: null });

    try {
      const release = await this.deps.source.latest();

      this.checkedAt = this.deps.now();

      if (release && isNewerVersion(release.version, this.deps.currentVersion)) {
        this.latest = {
          version: release.version,
          notes: release.notes,
          url: release.url,
          publishedAt: release.publishedAt,
        };
        this.installer = release.installer;
        this.set('available');
        this.notifyOnce(release.version);
      } else {
        this.latest = null;
        this.installer = null;
        this.set('idle');
      }
    } catch {
      // Sem rede (ou GitHub fora do ar): volta ao que era e conta o que houve.
      this.set(previous === 'checking' ? 'idle' : previous, {
        error: UpdateMessages.checkFailed,
      });
    }

    return this.status();
  }

  /** Baixa a versão nova e a aplica. Sem versão nova (ou já em andamento), não faz nada. */
  async install(): Promise<UpdateStatus> {
    if (this.state !== 'available' || !this.latest) {
      return this.status();
    }

    if (!this.deps.canInstall) {
      this.deps.openExternal(this.latest.url);

      return this.status();
    }

    const asset = this.installer;

    if (!asset) {
      return this.fail(UpdateMessages.noInstaller);
    }

    if (!asset.sha256) {
      return this.fail(UpdateMessages.noChecksum);
    }

    this.progress = 0;
    this.set('downloading', { error: null });

    try {
      const file = await this.deps.download({ ...asset, sha256: asset.sha256 }, (percent) => {
        this.progress = Math.max(0, Math.min(100, Math.round(percent)));
        this.deps.publish(this.status());
      });

      this.progress = 100;
      this.set('installing');
      await this.deps.launchInstaller(file);
    } catch (error) {
      return this.fail(friendlyMessage(error));
    }

    return this.status();
  }

  private busy(): boolean {
    return this.state === 'checking' || this.state === 'downloading' || this.state === 'installing';
  }

  private fail(message: string): UpdateStatus {
    this.progress = 0;
    this.set('available', { error: message });

    return this.status();
  }

  private notifyOnce(version: string): void {
    if (this.notifiedVersion === version) {
      return;
    }

    this.notifiedVersion = version;
    this.deps.notifyAvailable(UpdateMessages.notifyTitle, UpdateMessages.notifyBody(version));
  }

  private set(state: UpdateState, extra: { error?: string | null } = {}): void {
    this.state = state;

    if (extra.error !== undefined) {
      this.error = extra.error;
    }

    this.deps.publish(this.status());
  }
}
