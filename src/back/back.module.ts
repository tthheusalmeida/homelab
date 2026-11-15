import { Module, type DynamicModule } from '@nestjs/common';

import { BackConfig } from './config/back-config';
import { AIModule } from './modules/ai/ai.module';
import { WhisperService } from './modules/ai/whisper/whisper.service';
import { ChatModule } from './modules/chat/chat.module';
import { HealthAIModule } from './modules/health/ai/health-ai.module';
import { HealthSystemModule } from './modules/health/system/health-system.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LibraryModule } from './modules/library/library.module';
import { VideoModule } from './modules/video/video.module';

export interface BackModuleOptions {
  /** Configuração (pastas, URL do Ollama, chave do Gemini) vinda do Settings e dos segredos. */
  config: BackConfig;
  /** Quem transcreve o áudio (o `DesktopWhisperService`). */
  whisper: WhisperService;
}

/** Módulos do back, na ordem em que o app os usava. */
export const BACK_FEATURE_MODULES = [
  HealthSystemModule,
  HealthAIModule,
  JobsModule,
  LibraryModule,
  ChatModule,
  VideoModule,
  AIModule,
];

/**
 * Raiz do back dentro do desktop. O Nest é só contêiner de injeção de dependência
 * (`createApplicationContext`): não há servidor HTTP, controllers nem `.env`. A configuração e o
 * transcritor entram como providers globais, visíveis a todos os módulos.
 */
@Module({})
export class BackModule {
  static forRoot(options: BackModuleOptions): DynamicModule {
    return {
      module: BackModule,
      global: true,
      imports: BACK_FEATURE_MODULES,
      providers: [
        { provide: BackConfig, useValue: options.config },
        { provide: WhisperService, useValue: options.whisper },
      ],
      exports: [BackConfig, WhisperService],
    };
  }
}
