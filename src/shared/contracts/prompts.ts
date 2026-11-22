/**
 * Prompts de IA que o usuário pode personalizar (Configurações > Prompts). O usuário edita só as
 * **instruções** (o jeito de a IA trabalhar); o **contrato** com o app (formato da resposta, limites,
 * o conteúdo e as regras de segurança) é montado e conferido pelo back e nunca sai dele.
 */
export const PROMPT_KINDS = ['mindMap', 'infographic', 'classification'] as const;

export type PromptKind = (typeof PROMPT_KINDS)[number];

export function isPromptKind(value: unknown): value is PromptKind {
  return PROMPT_KINDS.includes(value as PromptKind);
}

/**
 * Tamanhos do **texto** do prompt e do nome de uma versão. O back barra o que sair desses limites
 * (a tela só os usa para o contador). Os limites do contrato (ex.: quantos ramos tem um mapa) não
 * são enviados à tela: quem os impõe é o back.
 */
export const PROMPT_LIMITS = {
  minChars: 40,
  maxChars: 20000,
  maxNameChars: 40,
  maxVersionsPerKind: 20,
} as const;

/** Uma versão nomeada de um prompt, criada pelo usuário. */
export interface PromptVersion {
  id: string;
  name: string;
  text: string;
}

export interface PromptKindInfo {
  kind: PromptKind;
  /** Nome para mostrar ("Mapa mental"). */
  label: string;
  /** Para que serve este prompt, em uma frase. */
  description: string;
  /** O texto padrão do app (não editável; a base para criar uma versão). */
  defaultText: string;
  versions: PromptVersion[];
  /** Id da versão em uso; `null` é o padrão do app. */
  activeId: string | null;
}

export interface PromptsOverview {
  kinds: PromptKindInfo[];
  limits: typeof PROMPT_LIMITS;
}

/** Cria (sem `id`) ou atualiza (com `id`) uma versão. `activate` já a deixa em uso. */
export interface PromptSaveRequest {
  kind: PromptKind;
  id?: string;
  name: string;
  text: string;
  activate?: boolean;
}

export interface PromptDeleteRequest {
  kind: PromptKind;
  id: string;
}

/** Escolhe a versão em uso; `id: null` volta ao padrão do app. */
export interface PromptActivateRequest {
  kind: PromptKind;
  id: string | null;
}
