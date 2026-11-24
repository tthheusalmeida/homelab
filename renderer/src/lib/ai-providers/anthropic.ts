import anthropicLogo from '../../assets/providers/anthropic.png';

import type { AiProviderProfile } from './types';

export const anthropicProfile: AiProviderProfile = {
  id: 'anthropic',
  name: 'Anthropic',
  company: 'Anthropic',
  hint: 'Anthropic · Claude é a família de modelos de IA da Anthropic, na nuvem.',
  logo: { src: anthropicLogo, fullBleed: true },
  sentTo: 'à Anthropic',
  console: {
    usageUrl: 'https://platform.claude.com/usage',
    usageLabel: 'Consumo no painel da Anthropic',
    billingUrl: 'https://platform.claude.com/settings/billing',
    billingLabel: 'Faturamento na Anthropic',
  },
  keyGuide: {
    title: 'Como criar a chave da Anthropic',
    steps: [
      {
        text: 'Abra o painel da Anthropic (Claude Console) e entre com a sua conta.',
        link: { href: 'https://platform.claude.com/settings/keys', label: 'Abrir o painel' },
      },
      { text: 'Clique em "Criar chave" (Create Key).' },
      {
        text: 'Quando perguntar onde a chave será usada, escolha "Em outro lugar" (Somewhere else).',
      },
      { text: 'Dê um nome à chave, por exemplo "HomeLab".' },
      { text: 'Escolha o período de validade da chave.' },
      { text: 'Copie a chave gerada (ela começa com "sk-ant-"): ela só aparece uma vez.' },
      { text: 'Cole a chave no campo "Chave da API" abaixo e clique em "Testar" para conferir.' },
      { text: 'Clique em "Salvar" e reinicie o HomeLab para a chave passar a valer.' },
    ],
    note: 'O uso da API é pago por consumo: adicione crédito na conta no painel. Quem tem a chave gasta o seu crédito: não compartilhe.',
  },
};
