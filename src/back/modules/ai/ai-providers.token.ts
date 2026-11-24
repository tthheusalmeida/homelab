/**
 * Token de injeção da lista de providers de IA. O `AIService` recebe a lista inteira e monta o
 * catálogo sozinho; um provider novo entra só na lista do `AIModule`.
 */
export const AI_PROVIDERS = Symbol('AI_PROVIDERS');
