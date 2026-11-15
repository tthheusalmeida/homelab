import { API_PREFIX, Messages } from './constants';
import { createGeminiProvider } from './gemini-provider-factory';
import { replaceModuleProvider, type MetadataAccess } from './module-patch';
import type { BackRuntime } from './back-runtime';
import { patchWhisperProvider } from './whisper-provider';

/** Módulos do back que compõem a API (mesma lista do `AppModule` do back, sem `ConfigModule`). */
export const BACK_MODULES = [
  ['modules/health/system/health-system.module', 'HealthSystemModule'],
  ['modules/health/ai/health-ai.module', 'HealthAIModule'],
  ['modules/jobs/jobs.module', 'JobsModule'],
  ['modules/library/library.module', 'LibraryModule'],
  ['modules/chat/chat.module', 'ChatModule'],
  ['modules/video/video.module', 'VideoModule'],
] as const;

/**
 * Módulos do back que declaram o `GeminiProvider` nos próprios providers
 * (o `VideoModule` repete o `AIService` e os providers). Todos precisam do patch.
 */
export const GEMINI_PROVIDER_MODULES = [
  ['modules/ai/ai.module', 'AIModule'],
  ['modules/video/video.module', 'VideoModule'],
] as const;

interface NestApp {
  enableCors(options: object): void;
  setGlobalPrefix(prefix: string): void;
  listen(port: string | number): Promise<unknown>;
  close(): Promise<void>;
  select(module: unknown): { get(token: unknown, options: { strict: boolean }): unknown };
}

interface NestCore {
  NestFactory: { create(module: unknown): Promise<NestApp> };
}

interface NestCommon {
  Module(metadata: object): (target: object) => void;
  Global(): (target: object) => void;
}

export interface NestHostOptions {
  /** Implementa o `AppConfig` do back (lê do Settings). */
  appConfig: unknown;
  geminiApiKey: string | null;
  /** Substitui o `WhisperService` do back (objeto com `transcribe(audioPath)`). */
  whisper: unknown;
  corsOrigin: string;
  port: string;
}

/**
 * Monta e sobe o Nest com os módulos do back, mas com o nosso `AppConfig` e sem o
 * `ConfigModule`/`.env`. Enquanto o front ainda usa HTTP, o servidor continua ativo.
 */
export class NestHost {
  private app: NestApp | null = null;

  constructor(
    private readonly runtime: BackRuntime,
    private readonly env: Record<string, string | undefined> = process.env,
  ) {}

  async start(options: NestHostOptions): Promise<void> {
    const { NestFactory } = this.runtime.pkg<NestCore>('@nestjs/core');
    const common = this.runtime.pkg<NestCommon>('@nestjs/common');

    this.patchGeminiProvider(options.geminiApiKey);
    patchWhisperProvider({
      runtime: this.runtime,
      metadata: this.metadata(),
      whisper: options.whisper,
    });

    const app = await NestFactory.create(this.buildRootModule(common, options.appConfig));

    app.enableCors({ origin: options.corsOrigin, credentials: true });
    app.setGlobalPrefix(API_PREFIX);

    await app.listen(options.port);

    this.app = app;
  }

  /**
   * Instância de um provider **declarada no módulo indicado** (os handlers IPC recebem os services
   * do back por aqui). `strict` evita pegar a cópia de outro módulo que repete o mesmo provider.
   */
  get<T>(token: unknown, moduleClass: unknown): T {
    if (!this.app) {
      throw new Error(Messages.hostNotStarted);
    }

    return this.app.select(moduleClass).get(token, { strict: true }) as T;
  }

  async stop(): Promise<void> {
    await this.app?.close();
    this.app = null;
  }

  private buildRootModule(common: NestCommon, appConfig: unknown): object {
    const { AppConfig } = this.runtime.module<{ AppConfig: unknown }>('config/env/app-config');

    class DesktopConfigModule {}
    common.Global()(DesktopConfigModule);
    common.Module({
      providers: [{ provide: AppConfig, useValue: appConfig }],
      exports: [AppConfig],
    })(DesktopConfigModule);

    const imports = BACK_MODULES.map(
      ([file, name]) => this.runtime.module<Record<string, unknown>>(file)[name],
    );

    class DesktopAppModule {}
    common.Module({ imports: [DesktopConfigModule, ...imports] })(DesktopAppModule);

    return DesktopAppModule;
  }

  private patchGeminiProvider(apiKey: string | null): void {
    const { GeminiProvider } = this.runtime.module<{
      GeminiProvider: new (usage: unknown) => unknown;
    }>('modules/ai/providers/gemini/gemini.provider');
    const { AiUsageService } = this.runtime.module<{ AiUsageService: unknown }>(
      'modules/ai/usage/ai-usage.service',
    );

    const replacement = {
      provide: GeminiProvider,
      inject: [AiUsageService],
      useFactory: (usage: unknown) =>
        createGeminiProvider({
          apiKey,
          providerClass: GeminiProvider,
          usage,
          env: this.env,
        }),
    };

    for (const [file, name] of GEMINI_PROVIDER_MODULES) {
      const moduleClass = this.runtime.module<Record<string, object>>(file)[name];

      replaceModuleProvider(this.metadata(), moduleClass, GeminiProvider, replacement);
    }
  }

  private metadata(): MetadataAccess {
    // `Reflect.getMetadata/defineMetadata` são instalados pelo `reflect-metadata` do back.
    const reflect = Reflect as unknown as {
      getMetadata(key: string, target: object): unknown;
      defineMetadata(key: string, value: unknown, target: object): void;
    };

    return {
      get: (key, target) => reflect.getMetadata(key, target),
      set: (key, value, target) => reflect.defineMetadata(key, value, target),
    };
  }
}
