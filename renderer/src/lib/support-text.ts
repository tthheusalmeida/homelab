/** Repositório do projeto: destino do convite para apoiar com uma estrela. */
export const REPOSITORY_URL = 'https://github.com/tthheusalmeida/homelab';

/**
 * Instante do ponto crítico da implosão da logo (47% de 7,5 × `--duration-enter`): os hexágonos
 * viram um ponto e o confete sai dali (ms). Acompanha `hl-implosion` em `global.css`.
 */
export const CRITICAL_POINT_MS = 1590;

/** Quando os hexágonos começam a voltar (53% da mesma linha do tempo); o texto de agradecimento entra aí (ms). */
export const RETURN_MS = 1790;

/** Quanto tempo o agradecimento fica na tela antes de o cartão sair: a logo termina de voltar aos 3,4 s (ms). */
export const THANKS_VISIBLE_MS = 4800;

/** Textos do convite para apoiar o projeto (Configurações > Sobre). */
export const SupportStrings = {
  title: 'Apoie o projeto',
  message: 'Gostando do HomeLab? Uma estrela no GitHub ajuda a apoiar o desenvolvimento.',
  open: 'Abrir no GitHub',
  alreadyStarred: 'Já dei minha estrela',
  thanksTitle: 'Obrigado pelo apoio!',
  thanksMessage: 'Sua estrela ajuda o HomeLab a continuar evoluindo.',
  requestFailed: 'Não foi possível salvar sua escolha. Tente de novo.',
} as const;
