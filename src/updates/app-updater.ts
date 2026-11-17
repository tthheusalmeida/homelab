import type { UpdateRelease, UpdateState, UpdateStatus } from '../shared/contracts/updates';

import type { NativeUpdater } from './native-updater';
import type { LatestRelease } from './release-source';
import { isNewerVersion } from './version';

export const UpdateMessages = {
  checkFailed: 'Não foi possível verificar as atualizações. Confira a conexão e tente de novo.',
  installFailed: 'Não foi possível baixar a atualização. Tente de novo.',
  noInstaller: 'Esta versão ainda não tem instalador para o seu sistema.',
  notifyTitle: 'Atualização do HomeLab disponível',
  notifyBody: (version: string) =>
    `A versão ${version} já pode ser instalada. Abra as Configurações.`,
  readyTitle: 'Atualização do HomeLab pronta',
  readyBody: (version: string) =>
    `A versão ${version} já foi baixada e será instalada ao reiniciar o app.`,
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
  /**
   * Atualizador que baixa só a diferença e instala (Windows empacotado). Sem ele, o app só avisa e
   * leva ao Release no navegador.
   */
  native: NativeUpdater | null;
  /** Qual é a versão mais nova (só tags `vX.Y.Z` do app) e o texto do Release. */
  source: UpdateSource;
  /** Preferência `updates.autoCheck`: verificar sozinho ao abrir e a cada 6 horas. */
  getAutoCheck(): boolean;
  saveAutoCheck(autoCheck: boolean): void;
  /** Avisa as janelas que o estado mudou. */
  publish(status: UpdateStatus): void;
  /** Notificação do sistema (só aparece com o app em segundo plano). */
  notify(title: string, body: string): void;
  openExternal(url: string): void;
  now(): number;
  timers?: UpdaterTimers;
}

const realTimers: UpdaterTimers = {
  setTimeout: (run, ms) => setTimeout(run, ms),
  setInterval: (run, ms) => setInterval(run, ms),
  clear: (handle) => clearTimeout(handle as NodeJS.Timeout),
};

/**
 * Atualização do app. Consulta o GitHub ao abrir e a cada 6 horas (se `autoCheck` estiver ligado) e,
 * havendo versão nova no Windows, baixa só a diferença sozinho; ao terminar fica `ready` e instala
 * ao reiniciar ou ao fechar o app. Falha de rede nunca derruba nada: vira uma mensagem no estado.
 * Não importa o Electron (tudo é injetado).
 */
export class AppUpdater {
  private state: UpdateState = 'idle';
  private latest: UpdateRelease | null = null;
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
      canInstall: this.deps.native !== null,
      autoCheck: this.deps.getAutoCheck(),
    };
  }

  /** Agenda a verificação de abertura e as periódicas (cada uma confere a preferência na hora). */
  start(): void {
    const timers = this.deps.timers ?? realTimers;
    const run = () => {
      if (this.deps.getAutoCheck()) {
        void this.check();
      }
    };

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

  setAutoCheck(autoCheck: boolean): UpdateStatus {
    this.deps.saveAutoCheck(autoCheck);
    this.deps.publish(this.status());

    return this.status();
  }

  /** Consulta o GitHub agora (manual ou agendada). Havendo versão nova no Windows, já baixa. */
  async check(): Promise<UpdateStatus> {
    // Versão já baixada: nada a consultar, só falta reiniciar.
    if (this.busy() || this.state === 'ready') {
      return this.status();
    }

    const previous = this.state;

    this.set('checking', { error: null });

    let release: LatestRelease | null;

    try {
      release = await this.deps.source.latest();
    } catch {
      // Sem rede (ou GitHub fora do ar): volta ao que era e conta o que houve.
      this.set(previous === 'checking' ? 'idle' : previous, {
        error: UpdateMessages.checkFailed,
      });

      return this.status();
    }

    this.checkedAt = this.deps.now();

    if (!release || !isNewerVersion(release.version, this.deps.currentVersion)) {
      this.latest = null;
      this.set('idle');

      return this.status();
    }

    this.latest = {
      version: release.version,
      notes: release.notes,
      url: release.url,
      publishedAt: release.publishedAt,
    };
    this.set('available');

    if (this.deps.native) {
      await this.download();
    } else {
      this.notifyOnce(UpdateMessages.notifyTitle, UpdateMessages.notifyBody(release.version));
    }

    return this.status();
  }

  /**
   * Com a versão pronta, reinicia e instala. Se o download automático tinha falhado, baixa de novo.
   * Fora do Windows (sem atualizador nativo), abre o Release no navegador.
   */
  async install(): Promise<UpdateStatus> {
    if (this.state === 'ready' && this.deps.native) {
      this.set('installing');
      this.deps.native.quitAndInstall();

      return this.status();
    }

    if (this.state !== 'available' || !this.latest) {
      return this.status();
    }

    if (!this.deps.native) {
      this.deps.openExternal(this.latest.url);

      return this.status();
    }

    await this.download();

    return this.status();
  }

  /** Baixa só a diferença da versão em `latest`. Erro volta para `available` com a mensagem. */
  private async download(): Promise<void> {
    const { native } = this.deps;
    const latest = this.latest;

    if (!native || !latest) {
      return;
    }

    this.progress = 0;
    this.set('downloading', { error: null });

    try {
      if (!(await native.prepare(latest.version))) {
        this.fail(UpdateMessages.noInstaller);

        return;
      }

      await native.download((percent) => {
        this.progress = Math.max(0, Math.min(100, Math.round(percent)));
        this.deps.publish(this.status());
      });
    } catch {
      this.fail(UpdateMessages.installFailed);

      return;
    }

    this.progress = 100;
    this.set('ready');
    this.notifyOnce(UpdateMessages.readyTitle, UpdateMessages.readyBody(latest.version));
  }

  private busy(): boolean {
    return this.state === 'checking' || this.state === 'downloading' || this.state === 'installing';
  }

  private fail(message: string): void {
    this.progress = 0;
    this.set('available', { error: message });
  }

  /** Uma notificação por versão e por tipo (disponível ou pronta). */
  private notifyOnce(title: string, body: string): void {
    const key = `${title}:${this.latest?.version ?? ''}`;

    if (this.notifiedVersion === key) {
      return;
    }

    this.notifiedVersion = key;
    this.deps.notify(title, body);
  }

  private set(state: UpdateState, extra: { error?: string | null } = {}): void {
    this.state = state;

    if (extra.error !== undefined) {
      this.error = extra.error;
    }

    this.deps.publish(this.status());
  }
}
