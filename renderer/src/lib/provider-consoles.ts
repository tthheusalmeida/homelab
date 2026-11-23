/**
 * Onde ver o consumo e o gasto REAL de cada IA externa. O Gemini não oferece, por chave de API,
 * nenhum endpoint de gasto nem de cota restante; o número real só existe no painel do provedor.
 * O que o app mostra é o consumo registrado por ele mesmo (ver `UsagePage`).
 */
export interface ProviderConsole {
  label: string;
  usageUrl: string;
  billingUrl: string;
}

export const PROVIDER_CONSOLES: Record<string, ProviderConsole> = {
  gemini: {
    label: "Gemini",
    usageUrl: "https://aistudio.google.com/usage",
    billingUrl: "https://console.cloud.google.com/billing",
  },
  anthropic: {
    label: "Anthropic",
    usageUrl: "https://platform.claude.com/usage",
    billingUrl: "https://platform.claude.com/settings/billing",
  },
};
