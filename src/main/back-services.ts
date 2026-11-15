import type { BackReaders } from '../ipc/handlers';

import type { BackRuntime } from './back-runtime';

type ClassSource = readonly [file: string, name: string];

interface ServiceSource {
  service: ClassSource;
  /** Módulo do back que declara essa instância (o `VideoModule` repete o `AIService` e o `AiUsageService`). */
  module: ClassSource;
}

const AI_MODULE: ClassSource = ['modules/ai/ai.module', 'AIModule'];

/**
 * Onde cada service do back mora em `back/dist` e **de qual módulo** vem a instância.
 * Resolver só pelo token pegaria a primeira cópia encontrada, que pode ser a do `VideoModule`
 * (com outro `usage` em memória), e o Uso por IPC divergiria do que o chat registra.
 */
export const BackServiceSources = {
  healthSystem: {
    service: ['modules/health/system/health-system.service', 'HealthSystemService'],
    module: ['modules/health/system/health-system.module', 'HealthSystemModule'],
  },
  healthAi: {
    service: ['modules/health/ai/health-ai.service', 'HealthAIService'],
    module: ['modules/health/ai/health-ai.module', 'HealthAIModule'],
  },
  ai: { service: ['modules/ai/ai.service', 'AIService'], module: AI_MODULE },
  aiUsage: {
    service: ['modules/ai/usage/ai-usage.service', 'AiUsageService'],
    module: AI_MODULE,
  },
  chat: {
    service: ['modules/chat/chat.service', 'ChatService'],
    module: ['modules/chat/chat.module', 'ChatModule'],
  },
} as const satisfies Record<string, ServiceSource>;

/** Devolve a instância de `token` declarada em `moduleClass`. */
type Resolver = (token: unknown, moduleClass: unknown) => unknown;

/**
 * Entrega os services do back (a mesma instância que o HTTP usa) aos handlers IPC.
 * As classes são carregadas pelo `BackRuntime` e a instância vem do contêiner do Nest.
 */
export class BackServices {
  constructor(
    private readonly runtime: Pick<BackRuntime, 'module'>,
    private readonly resolve: Resolver,
  ) {}

  readers(): BackReaders {
    return {
      healthSystem: this.service(BackServiceSources.healthSystem),
      healthAi: this.service(BackServiceSources.healthAi),
      ai: this.service(BackServiceSources.ai),
      aiUsage: this.service(BackServiceSources.aiUsage),
      chat: this.service(BackServiceSources.chat),
    };
  }

  private service<T>(source: ServiceSource): T {
    return this.resolve(this.load(source.service), this.load(source.module)) as T;
  }

  private load([file, name]: ClassSource): unknown {
    return this.runtime.module<Record<string, unknown>>(file)[name];
  }
}
