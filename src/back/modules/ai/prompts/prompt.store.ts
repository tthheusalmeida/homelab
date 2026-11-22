import { Injectable, Optional } from '@nestjs/common';

import {
  isPromptKind,
  PROMPT_KINDS,
  type PromptKind,
  type PromptVersion,
} from '../../../../shared/contracts/prompts';
import { JsonFile } from '../../../../storage/json-file';
import { BackAlerts } from '../../../config/back-alerts';
import { BackConfig } from '../../../config/back-config';

/** O que fica guardado de um prompt: as versões do usuário e qual está em uso (`null` = padrão). */
export interface StoredPrompt {
  activeId: string | null;
  versions: PromptVersion[];
}

type StoredPrompts = Partial<Record<PromptKind, StoredPrompt>>;

interface PromptsFileData {
  version: 1;
  prompts: StoredPrompts;
}

const emptyPrompt = (): StoredPrompt => ({ activeId: null, versions: [] });

function isVersion(value: unknown): value is PromptVersion {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { id, name, text } = value as Record<string, unknown>;

  return (
    typeof id === 'string' && id !== '' && typeof name === 'string' && typeof text === 'string'
  );
}

/** Lê o que veio do disco sem confiar nele: tipos errados e tipos de prompt desconhecidos saem. */
export function sanitizePrompts(raw: unknown): StoredPrompts {
  const result: StoredPrompts = {};
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  for (const kind of PROMPT_KINDS) {
    const entry = source[kind];

    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const { activeId, versions } = entry as { activeId?: unknown; versions?: unknown };
    const valid = Array.isArray(versions) ? versions.filter(isVersion) : [];
    const active =
      typeof activeId === 'string' && valid.some((version) => version.id === activeId)
        ? activeId
        : null;

    result[kind] = {
      activeId: active,
      versions: valid.map(({ id, name, text }) => ({ id, name, text })),
    };
  }

  return result;
}

/**
 * Prompts personalizados em `config/prompts.json` (sem arquivo no `BackConfig`, só em memória, como
 * nos testes). Guarda **só o que o usuário criou**: o padrão não é copiado para cá, então uma versão
 * nova do app que melhora o padrão chega a quem nunca mexeu.
 */
@Injectable()
export class PromptStore {
  private readonly file: JsonFile<PromptsFileData> | null;

  private prompts: StoredPrompts | null = null;

  constructor(
    @Optional() config?: BackConfig,
    @Optional() private readonly alerts?: BackAlerts,
  ) {
    this.file = config?.promptsFile ? new JsonFile<PromptsFileData>(config.promptsFile) : null;
  }

  /** O que está guardado de um tipo de prompt (uma cópia; vazio se nunca foi mexido). */
  get(kind: PromptKind): StoredPrompt {
    return structuredClone(this.load()[kind] ?? emptyPrompt());
  }

  set(kind: PromptKind, prompt: StoredPrompt): void {
    const all = this.load();

    // Sem versões e no padrão: não há o que guardar.
    if (prompt.versions.length === 0 && prompt.activeId === null) {
      delete all[kind];
    } else {
      all[kind] = structuredClone(prompt);
    }

    this.save();
  }

  /** Tudo o que está guardado, para o backup. */
  exportAll(): Array<{ kind: PromptKind; prompt: StoredPrompt }> {
    return Object.entries(this.load())
      .filter((entry): entry is [PromptKind, StoredPrompt] => isPromptKind(entry[0]))
      .map(([kind, prompt]) => ({ kind, prompt: structuredClone(prompt) }));
  }

  private load(): StoredPrompts {
    if (this.prompts) {
      return this.prompts;
    }

    try {
      this.prompts = sanitizePrompts(this.file?.read()?.prompts);
    } catch {
      // ilegível (e sem cópia boa): volta ao padrão do app; nada do app depende disso para funcionar
      this.prompts = {};
    }

    return this.prompts;
  }

  private save(): void {
    try {
      this.file?.write({ version: 1, prompts: this.load() });
    } catch (error) {
      // vale em memória até fechar o app; o usuário precisa saber que não ficou em disco
      this.alerts?.persistFailed(
        'os prompts',
        error instanceof Error ? error.message : 'erro desconhecido',
      );
    }
  }
}
