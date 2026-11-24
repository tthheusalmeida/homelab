import { BadRequestException, Injectable } from '@nestjs/common';

import {
  type AiChoice,
  type AiChoiceSource,
  type AiPreference,
  type AiProviderId,
  type AiSelectionState,
} from '../../../shared/contracts/ai';
import { EXTERNAL_PROVIDER_IDS } from '../../../shared/contracts/providers';
import { BackConfig } from '../../config/back-config';

import { AIService } from './ai.service';

export const DefaultAiMessages = {
  noModel:
    'Escolha um modelo para a IA padrão em Configurações: este serviço não tem um modelo automático.',
} as const;

/** O que um chamador pode fixar para uma tarefa; o que faltar vem das camadas abaixo. */
export interface AiExplicitChoice {
  providerId?: AiProviderId;
  modelId?: string;
}

/**
 * Decide qual IA vale para mapa mental, infográfico e sugestão de título. Camadas, da mais forte à
 * mais fraca: o que o chamador pediu, a troca **desta sessão** (some ao fechar o app), o **padrão**
 * salvo em Configurações e, sem nenhum dos dois, o modelo mais barato do primeiro serviço externo
 * com chave. Quem usa só chama `resolve()`: não conhece provider nem modelo por nome.
 */
@Injectable()
export class DefaultAiService {
  private session: AiPreference | null = null;

  constructor(
    private readonly ai: AIService,
    private readonly config: BackConfig,
  ) {}

  /** Troca a IA só até o app fechar; `null` volta ao padrão. */
  setSession(preference: AiPreference | null): AiSelectionState {
    this.session = preference;

    return this.state();
  }

  state(): AiSelectionState {
    const configured = this.config.defaultAi();
    const source: AiChoiceSource = this.session ? 'session' : configured ? 'default' : 'auto';

    return {
      configured,
      session: this.session,
      effective: { ...this.resolve(), source },
    };
  }

  /** A IA que vale agora; `explicit` (ex.: um modelo escolhido na tela) sobrepõe as camadas. */
  resolve(explicit: AiExplicitChoice = {}): AiChoice {
    const preference = this.session ?? this.config.defaultAi();
    const providerId = explicit.providerId ?? preference?.providerId ?? this.autoProvider();
    const preferredModel = preference?.providerId === providerId ? preference.modelId : null;
    const modelId = explicit.modelId?.trim() || preferredModel || this.ai.cheapestModel(providerId);

    if (!modelId) {
      throw new BadRequestException(DefaultAiMessages.noModel);
    }

    return { providerId, modelId };
  }

  /** Sem escolha nenhuma: o primeiro serviço externo que tem chave (ou o primeiro da lista). */
  private autoProvider(): AiProviderId {
    return (
      EXTERNAL_PROVIDER_IDS.find((id) => this.config.apiKeyFor(id)) ?? EXTERNAL_PROVIDER_IDS[0]
    );
  }
}
