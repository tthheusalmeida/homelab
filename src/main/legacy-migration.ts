import * as fs from 'node:fs';
import * as path from 'node:path';

import type { AppPaths } from '../settings/app-paths';
import { JsonFile } from '../storage/json-file';
import type { SettingsPatch } from '../shared/contracts/settings';
import { copyTree, isEmptyDir, isSameOrInside, reasonOf } from '../storage/tree';

/**
 * Migração **temporária** dos dados do formato antigo (pastas soltas e `settings.json` em
 * `userData`) para a raiz única (`docs/persistencia.md`). Reaproveita a cópia conferida da troca de
 * pasta da biblioteca, **nunca apaga a origem** e só marca o arquivo antigo como migrado no fim.
 * Pode sair do código depois que os dados existentes tiverem sido migrados.
 */

export const LegacyFiles = {
  settings: 'settings.json',
  usage: 'ai-usage.json',
  migratedSuffix: '.migrated',
} as const;

export type MigrationChoice = 'move' | 'keep' | 'later';

/** O que existe no formato antigo e será oferecido ao usuário. */
export interface MigrationPlan {
  /** Biblioteca antiga com conteúdo, ou `null`. */
  libraryDir: string | null;
  /** Entrada antiga com conteúdo, ou `null`. */
  inboxDir: string | null;
  hasUsage: boolean;
  /** Para onde vai a biblioteca se o usuário escolher mover. */
  newLibraryDir: string;
  newRootDir: string;
}

export type MigrationOutcome =
  | { status: 'none' }
  | { status: 'later' }
  | { status: 'done'; choice: 'move' | 'keep'; warnings: string[] }
  | { status: 'failed'; error: string };

export const MigrationMessages = {
  libraryNotEmpty: (dir: string) =>
    `A pasta ${dir} já tem arquivos; a biblioteca antiga ficou onde estava e continua em uso.`,
  inboxNotEmpty: (dir: string) =>
    `A pasta ${dir} já tem arquivos; a entrada antiga não foi copiada.`,
  failed: (reason: string) =>
    `${reason} Seus dados antigos continuam intactos e o HomeLab tentará de novo na próxima abertura.`,
} as const;

export interface LegacyMigrationOptions {
  userDataDir: string;
  appPaths: AppPaths;
  /** Pergunta ao usuário o que fazer com os dados antigos (só quando há dados para levar). */
  confirm: (plan: MigrationPlan) => Promise<MigrationChoice>;
}

interface LegacySettings {
  paths?: { libraryDir?: string; inboxDir?: string };
  appearance?: SettingsPatch['appearance'];
  local?: { ollama?: { url?: string } };
}

export class LegacyMigration {
  /** Pastas de destino que **esta** rotina encheu (estavam vazias): são desfeitas se algo falhar. */
  private filled: string[] = [];

  constructor(private readonly options: LegacyMigrationOptions) {}

  async run(): Promise<MigrationOutcome> {
    const legacy = this.readLegacy();

    if (!legacy) {
      return { status: 'none' };
    }

    const plan = await this.plan(legacy);
    const hasData = plan.libraryDir !== null || plan.inboxDir !== null || plan.hasUsage;
    const choice: MigrationChoice = hasData ? await this.options.confirm(plan) : 'keep';

    if (choice === 'later') {
      this.writeSettingsIfMissing(legacy, legacy.paths?.libraryDir);

      return { status: 'later' };
    }

    try {
      const warnings = await this.migrate(legacy, plan, choice);

      this.markAsMigrated();

      return { status: 'done', choice, warnings };
    } catch (error) {
      await this.undoCopies();

      // O app ainda precisa abrir com a biblioteca de sempre, mesmo sem a migração.
      this.writeSettingsIfMissing(legacy, legacy.paths?.libraryDir);

      return { status: 'failed', error: MigrationMessages.failed(reasonOf(error)) };
    }
  }

  private get legacySettingsFile(): string {
    return path.join(this.options.userDataDir, LegacyFiles.settings);
  }

  private get legacyUsageFile(): string {
    return path.join(this.options.userDataDir, LegacyFiles.usage);
  }

  private readLegacy(): LegacySettings | null {
    try {
      return new JsonFile<LegacySettings>(this.legacySettingsFile).read();
    } catch {
      // arquivo antigo ilegível: não há como migrar; o app segue com os padrões
      return null;
    }
  }

  private async plan(legacy: LegacySettings): Promise<MigrationPlan> {
    const { appPaths } = this.options;
    const withContent = async (dir: string | undefined): Promise<string | null> =>
      dir && path.isAbsolute(dir) && !(await isEmptyDir(dir)) ? dir : null;

    return {
      libraryDir: await withContent(legacy.paths?.libraryDir),
      inboxDir: await withContent(legacy.paths?.inboxDir),
      hasUsage: fs.existsSync(this.legacyUsageFile),
      newLibraryDir: appPaths.defaultLibraryDir,
      newRootDir: appPaths.rootDir,
    };
  }

  private async migrate(
    legacy: LegacySettings,
    plan: MigrationPlan,
    choice: 'move' | 'keep',
  ): Promise<string[]> {
    const { appPaths } = this.options;
    const warnings: string[] = [];
    let libraryDir = legacy.paths?.libraryDir;

    if (choice === 'move' && plan.libraryDir) {
      libraryDir = await this.moveLibrary(plan, warnings, libraryDir);
    }

    if (plan.inboxDir) {
      if (
        isSameOrInside(plan.inboxDir, appPaths.inboxDir) ||
        isSameOrInside(appPaths.inboxDir, plan.inboxDir)
      ) {
        // a entrada antiga já é a nova (ou uma contém a outra): nada a copiar
      } else if (await isEmptyDir(appPaths.inboxDir)) {
        this.filled.push(appPaths.inboxDir);
        await copyTree(plan.inboxDir, appPaths.inboxDir);
      } else {
        warnings.push(MigrationMessages.inboxNotEmpty(appPaths.inboxDir));
      }
    }

    if (plan.hasUsage && !fs.existsSync(appPaths.usageFile)) {
      fs.mkdirSync(path.dirname(appPaths.usageFile), { recursive: true });
      fs.copyFileSync(this.legacyUsageFile, appPaths.usageFile);
    }

    this.writeSettings(legacy, libraryDir);

    return warnings;
  }

  /** Copia a biblioteca para a pasta padrão; se o destino não estiver vazio, mantém a antiga em uso. */
  private async moveLibrary(
    plan: MigrationPlan,
    warnings: string[],
    fallback: string | undefined,
  ): Promise<string | undefined> {
    const target = plan.newLibraryDir;

    if (
      isSameOrInside(plan.libraryDir as string, target) &&
      isSameOrInside(target, plan.libraryDir as string)
    ) {
      return target;
    }

    if (
      isSameOrInside(plan.libraryDir as string, target) ||
      isSameOrInside(target, plan.libraryDir as string) ||
      !(await isEmptyDir(target))
    ) {
      warnings.push(MigrationMessages.libraryNotEmpty(target));

      return fallback;
    }

    this.filled.push(target);
    await copyTree(plan.libraryDir as string, target);

    return target;
  }

  /** O destino estava vazio antes da cópia, então apagar o que foi copiado é seguro. */
  private async undoCopies(): Promise<void> {
    for (const dir of this.filled) {
      await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }

    this.filled = [];
  }

  private writeSettings(legacy: LegacySettings, libraryDir: string | undefined): void {
    const settings: SettingsPatch = {
      ...(libraryDir ? { paths: { libraryDir } } : {}),
      ...(legacy.appearance ? { appearance: legacy.appearance } : {}),
      ...(legacy.local?.ollama?.url ? { local: { ollama: { url: legacy.local.ollama.url } } } : {}),
    };

    new JsonFile<SettingsPatch>(this.options.appPaths.settingsFile).write(settings);
  }

  private writeSettingsIfMissing(legacy: LegacySettings, libraryDir: string | undefined): void {
    if (!fs.existsSync(this.options.appPaths.settingsFile)) {
      this.writeSettings(legacy, libraryDir);
    }
  }

  /** Só depois de tudo certo: os arquivos antigos viram `.migrated` (nada é apagado). */
  private markAsMigrated(): void {
    for (const file of [this.legacySettingsFile, this.legacyUsageFile]) {
      if (fs.existsSync(file)) {
        fs.renameSync(file, `${file}${LegacyFiles.migratedSuffix}`);
      }
    }
  }
}
