import geminiLogo from '../../assets/providers/gemini.png';

import type { AiProviderProfile } from './types';

export const geminiProfile: AiProviderProfile = {
  id: 'gemini',
  name: 'Gemini',
  company: 'Google',
  hint: 'Google · Gemini é a família de modelos de IA do Google, na nuvem.',
  logo: { src: geminiLogo },
  sentTo: 'ao Gemini',
  console: {
    usageUrl: 'https://aistudio.google.com/usage',
    usageLabel: 'Consumo no Google AI Studio',
    billingUrl: 'https://console.cloud.google.com/billing',
    billingLabel: 'Faturamento no Google Cloud',
  },
  keyGuide: {
    title: 'Como criar a chave do Gemini',
    steps: [
      {
        text: 'Abra o Google AI Studio e entre com a sua conta Google.',
        link: { href: 'https://aistudio.google.com/apikey', label: 'Abrir o AI Studio' },
      },
      { text: 'Clique em "Criar chave de API" (Create API key).' },
      {
        text: 'Escolha um projeto do Google Cloud ou deixe o AI Studio criar um novo, e confirme.',
      },
      { text: 'Copie a chave gerada (ela começa com "AIza").' },
      { text: 'Cole a chave no campo "Chave da API" abaixo e clique em "Testar" para conferir.' },
      { text: 'Clique em "Salvar" e reinicie o HomeLab para a chave passar a valer.' },
    ],
    note: 'O uso gratuito tem limites por minuto e por dia. Para ir além, ative o faturamento no Google Cloud. Quem tem a chave usa a sua cota: não compartilhe.',
  },
};
