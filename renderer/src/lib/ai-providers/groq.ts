import groqLogo from '../../assets/providers/groq.png';

import type { AiProviderProfile } from './types';

export const groqProfile: AiProviderProfile = {
  id: 'groq',
  name: 'Groq',
  company: 'Groq',
  hint: 'Groq · modelos abertos (GPT-OSS, Qwen) com respostas muito rápidas, na nuvem.',
  logo: { src: groqLogo },
  sentTo: 'à Groq',
  console: {
    usageUrl: 'https://console.groq.com/dashboard/usage',
    usageLabel: 'Consumo no painel da Groq',
    billingUrl: 'https://console.groq.com/settings/billing',
    billingLabel: 'Faturamento na Groq',
  },
  keyGuide: {
    title: 'Como criar a chave da Groq',
    steps: [
      {
        text: 'Abra o painel da Groq (GroqCloud) e entre com a sua conta.',
        link: { href: 'https://console.groq.com/keys', label: 'Abrir o painel' },
      },
      { text: 'Clique em "Criar chave de API" (Create API Key).' },
      { text: 'Dê um nome à chave, por exemplo "HomeLab".' },
      { text: 'Copie a chave gerada (ela começa com "gsk_"): ela só aparece uma vez.' },
      { text: 'Cole a chave no campo "Chave da API" abaixo e clique em "Testar" para conferir.' },
      { text: 'Clique em "Salvar" e reinicie o HomeLab para a chave passar a valer.' },
    ],
    note: 'A Groq tem um plano gratuito com limites de uso; passando deles, o uso é pago por consumo. Quem tem a chave gasta a sua cota: não compartilhe.',
  },
};
