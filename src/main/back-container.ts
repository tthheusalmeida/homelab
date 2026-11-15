import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { BackModule, type BackModuleOptions } from '../back/back.module';

interface NestContext {
  get<T>(token: unknown): T;
  close(): Promise<void>;
}

/**
 * Contêiner de injeção de dependência do back dentro do main. O Nest sobe só como contexto
 * (`createApplicationContext`): sem servidor HTTP, sem porta aberta, sem controllers.
 */
export class BackContainer {
  private constructor(private readonly context: NestContext) {}

  static async start(options: BackModuleOptions): Promise<BackContainer> {
    const context = await NestFactory.createApplicationContext(BackModule.forRoot(options));

    return new BackContainer(context);
  }

  /** Instância de um provider. Cada service do back é declarado em um só módulo, então é única. */
  get<T>(token: unknown): T {
    return this.context.get<T>(token);
  }

  async stop(): Promise<void> {
    await this.context.close();
  }
}
