import type { AiChoiceSource } from '#shared/contracts/ai';

/** Textos da IA em uso (chip, troca da sessão e IA padrão em Configurações). */
export const AiInUseStrings = {
  label: 'IA em uso',
  scope: 'Vale para a sugestão de título, o mapa mental e o infográfico.',
  sources: {
    session: 'Só nesta sessão',
    default: 'Padrão',
    auto: 'Automática',
  } satisfies Record<AiChoiceSource, string>,
  switchButton: 'Trocar',
  hide: 'Ocultar a IA em uso',
  show: 'Mostrar a IA em uso',
  switchLabel: 'Trocar a IA nesta sessão',
  dialog: {
    title: 'Usar outra IA nesta sessão',
    description:
      'Vale só até fechar o app; ao abrir de novo, volta a IA padrão. Serve, por exemplo, quando o serviço está sobrecarregado.',
    confirm: 'Usar nesta sessão',
    backToDefault: 'Voltar ao padrão',
    cancel: 'Cancelar',
  },
  picker: {
    provider: 'Serviço',
    model: 'Modelo',
    auto: 'Automática',
    autoModel: 'Mais barato (automático)',
  },
  settings: {
    hint: 'A IA que faz a sugestão de título, o mapa mental e o infográfico. Para trocar só por um tempo (por exemplo, quando o serviço está sobrecarregado), use "Trocar" ao lado do botão de gerar: vale até fechar o app.',
    autoHint: 'Automática: usa o modelo mais barato do primeiro serviço que tem chave configurada.',
    save: 'Salvar',
    saved: 'IA padrão salva.',
    current: 'IA em uso agora',
    sessionNote:
      'Há uma troca só desta sessão em uso. Ao salvar a IA padrão, ela é desfeita e a nova passa a valer agora.',
  },
  failed: 'Não foi possível trocar a IA.',
} as const;

/** Rótulo curto de uma escolha: "Anthropic · claude-haiku-5-5". */
export function formatAiChoice(serviceName: string, modelId: string): string {
  return `${serviceName} · ${modelId}`;
}
