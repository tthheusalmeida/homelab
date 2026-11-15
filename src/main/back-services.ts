import type { BackReaders } from '../ipc/handlers';

import type { BackRuntime } from './back-runtime';

/** Onde cada service do back mora em `back/dist` (arquivo sem extensão e nome da classe). */
export const BackServiceSources = {
  healthSystem: ['modules/health/system/health-system.service', 'HealthSystemService'],
  healthAi: ['modules/health/ai/health-ai.service', 'HealthAIService'],
  ai: ['modules/ai/ai.service', 'AIService'],
  aiUsage: ['modules/ai/usage/ai-usage.service', 'AiUsageService'],
} as const;

type Resolver = (token: unknown) => unknown;

/**
 * Entrega os services do back (a mesma instância que o HTTP usa) aos handlers IPC.
 * A classe é carregada pelo `BackRuntime` e a instância vem do contêiner do Nest.
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
    };
  }

  private service<T>([file, name]: readonly [string, string]): T {
    const token = this.runtime.module<Record<string, unknown>>(file)[name];

    return this.resolve(token) as T;
  }
}
