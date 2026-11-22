import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  isPromptKind,
  PROMPT_KINDS,
  PROMPT_LIMITS,
  type PromptActivateRequest,
  type PromptDeleteRequest,
  type PromptKind,
  type PromptSaveRequest,
  type PromptsOverview,
} from '../../../../shared/contracts/prompts';

import { PROMPT_CATALOG } from './prompt-catalog';
import { PromptStore } from './prompt.store';

export const PromptMessages = {
  unknownKind: 'Esse prompt não existe.',
  unknownVersion: 'Essa versão do prompt não existe mais.',
  nameRequired: 'Dê um nome para a versão.',
  nameTooLong: (max: number) => `O nome pode ter no máximo ${max} caracteres.`,
  nameTaken: 'Já existe uma versão com esse nome.',
  textTooShort: (min: number) => `O prompt precisa ter pelo menos ${min} caracteres.`,
  textTooLong: (max: number) => `O prompt pode ter no máximo ${max} caracteres.`,
  tooManyVersions: (max: number) => `Cada prompt pode ter até ${max} versões. Exclua alguma antes.`,
} as const;

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;
}

/**
 * Prompts personalizáveis: o padrão do app (no código) mais as **versões nomeadas** do usuário, com
 * uma em uso. É só a parte de **instruções** que muda; o contrato com a IA (formato da resposta,
 * limites, segurança) fica em cada `*.prompt.ts`, e o tamanho do texto é barrado aqui.
 */
@Injectable()
export class PromptService {
  constructor(private readonly store: PromptStore) {}

  overview(): PromptsOverview {
    return {
      kinds: PROMPT_KINDS.map((kind) => {
        const { label, description, defaultText } = PROMPT_CATALOG[kind];
        const { versions, activeId } = this.store.get(kind);

        return { kind, label, description, defaultText, versions, activeId };
      }),
      limits: PROMPT_LIMITS,
    };
  }

  /** As instruções em uso agora: as da versão ativa ou, sem nenhuma, o padrão do app. */
  instructionsFor(kind: PromptKind): string {
    const { versions, activeId } = this.store.get(kind);
    const active = versions.find((version) => version.id === activeId);

    return active ? active.text : PROMPT_CATALOG[kind].defaultText;
  }

  /** Cria (sem `id`) ou atualiza (com `id`) uma versão; com `activate`, já a deixa em uso. */
  save(request: PromptSaveRequest): PromptsOverview {
    const kind = this.kindOf(request.kind);
    const name = this.nameOf(request.name);
    const text = this.textOf(request.text);
    const stored = this.store.get(kind);
    const taken = stored.versions.some(
      (version) => version.id !== request.id && sameName(version.name, name),
    );

    if (taken) {
      throw new BadRequestException(PromptMessages.nameTaken);
    }

    let id = request.id;

    if (id === undefined) {
      if (stored.versions.length >= PROMPT_LIMITS.maxVersionsPerKind) {
        throw new BadRequestException(
          PromptMessages.tooManyVersions(PROMPT_LIMITS.maxVersionsPerKind),
        );
      }

      id = randomUUID();
      stored.versions.push({ id, name, text });
    } else {
      const version = stored.versions.find((entry) => entry.id === id);

      if (!version) {
        throw new NotFoundException(PromptMessages.unknownVersion);
      }

      version.name = name;
      version.text = text;
    }

    if (request.activate) {
      stored.activeId = id;
    }

    this.store.set(kind, stored);

    return this.overview();
  }

  /** Apaga uma versão; se era a em uso, volta ao padrão do app. */
  delete(request: PromptDeleteRequest): PromptsOverview {
    const kind = this.kindOf(request.kind);
    const stored = this.store.get(kind);

    if (!stored.versions.some((version) => version.id === request.id)) {
      throw new NotFoundException(PromptMessages.unknownVersion);
    }

    stored.versions = stored.versions.filter((version) => version.id !== request.id);

    if (stored.activeId === request.id) {
      stored.activeId = null;
    }

    this.store.set(kind, stored);

    return this.overview();
  }

  /** Escolhe a versão em uso; `id: null` volta ao padrão do app. */
  activate(request: PromptActivateRequest): PromptsOverview {
    const kind = this.kindOf(request.kind);
    const stored = this.store.get(kind);

    if (request.id !== null && !stored.versions.some((version) => version.id === request.id)) {
      throw new NotFoundException(PromptMessages.unknownVersion);
    }

    stored.activeId = request.id;
    this.store.set(kind, stored);

    return this.overview();
  }

  private kindOf(value: unknown): PromptKind {
    if (!isPromptKind(value)) {
      throw new BadRequestException(PromptMessages.unknownKind);
    }

    return value;
  }

  private nameOf(value: unknown): string {
    const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

    if (name === '') {
      throw new BadRequestException(PromptMessages.nameRequired);
    }

    if (name.length > PROMPT_LIMITS.maxNameChars) {
      throw new BadRequestException(PromptMessages.nameTooLong(PROMPT_LIMITS.maxNameChars));
    }

    return name;
  }

  private textOf(value: unknown): string {
    const text = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';

    if (text.length < PROMPT_LIMITS.minChars) {
      throw new BadRequestException(PromptMessages.textTooShort(PROMPT_LIMITS.minChars));
    }

    if (text.length > PROMPT_LIMITS.maxChars) {
      throw new BadRequestException(PromptMessages.textTooLong(PROMPT_LIMITS.maxChars));
    }

    return text;
  }
}
