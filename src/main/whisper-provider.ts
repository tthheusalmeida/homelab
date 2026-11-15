import type { BackRuntime } from './back-runtime';
import { replaceModuleProvider, type MetadataAccess } from './module-patch';

/** Módulos do back que declaram o `WhisperService` (só o `AIModule`; os processors o recebem dele). */
export const WHISPER_SERVICE_MODULES = [['modules/ai/ai.module', 'AIModule']] as const;

export const WHISPER_SERVICE_SOURCE = [
  'modules/ai/whisper/whisper.service',
  'WhisperService',
] as const;

export interface WhisperPatchOptions {
  runtime: Pick<BackRuntime, 'module'>;
  metadata: MetadataAccess;
  /** Objeto com `transcribe(audioPath)` que ocupa o lugar do `WhisperService` do back. */
  whisper: unknown;
}

/**
 * Troca o `WhisperService` do back (que junta pasta + executável e pasta + modelo na construção)
 * pelo serviço do desktop, antes de o Nest subir e sem editar o back. Mesmo mecanismo do Gemini.
 */
export function patchWhisperProvider({ runtime, metadata, whisper }: WhisperPatchOptions): void {
  const [file, name] = WHISPER_SERVICE_SOURCE;
  const token = runtime.module<Record<string, unknown>>(file)[name];

  for (const [moduleFile, moduleName] of WHISPER_SERVICE_MODULES) {
    const moduleClass = runtime.module<Record<string, object>>(moduleFile)[moduleName];

    replaceModuleProvider(metadata, moduleClass, token, { provide: token, useValue: whisper });
  }
}
