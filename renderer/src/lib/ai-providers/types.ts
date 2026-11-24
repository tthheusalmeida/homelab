import type { AiProviderId } from '#shared/contracts/ai';

/** Um passo do guia de configuração; o `link` aparece ao fim do passo. */
export interface KeyGuideStep {
  text: string;
  link?: { href: string; label: string };
}

/**
 * Tudo o que a interface sabe de um provider de IA, num lugar só. Um provider novo cria o seu
 * perfil (um arquivo em `lib/ai-providers/`) e o registra em `lib/ai-providers.ts`: Configurações,
 * Consumo, o logo e o aviso de privacidade passam a conhecê-lo sem mais nenhuma mudança.
 */
export interface AiProviderProfile {
  id: AiProviderId;
  /** Nome do serviço em listas e botões (ex.: "Gemini"). */
  name: string;
  /** Empresa dona do serviço: é o título do cartão em Configurações. */
  company: string;
  /** Uma linha sob o título do cartão. */
  hint: string;
  /** Imagem da marca; `fullBleed` quando ela já traz o próprio fundo. */
  logo?: { src: string; fullBleed?: boolean };
  /**
   * Para onde o texto vai, já com a preposição (ex.: "ao Gemini", "à Anthropic"). Sem isto o
   * provider roda no computador do usuário (nada sai dele).
   */
  sentTo?: string;
  /** Onde ver o consumo e o gasto REAL (o provedor não os informa pela chave de API). */
  console?: {
    usageUrl: string;
    usageLabel: string;
    billingUrl: string;
    billingLabel: string;
  };
  /** Passo a passo para criar a chave; aparece até ela ser salva. */
  keyGuide?: {
    title: string;
    steps: readonly KeyGuideStep[];
    note?: string;
  };
}
