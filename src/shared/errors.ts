/** Códigos de erro que atravessam o IPC. */
export const IpcErrorCode = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  PROVIDER_FAILED: 'PROVIDER_FAILED',
  /** Falha ao gravar, copiar ou apagar arquivos do usuário (disco cheio, arquivo em uso, permissão). */
  PERSIST_FAILED: 'PERSIST_FAILED',
  INTERNAL: 'INTERNAL',
} as const;

export type IpcErrorCode = (typeof IpcErrorCode)[keyof typeof IpcErrorCode];

/** Mensagens padrão (usadas quando a exceção original não traz mensagem). */
export const IpcDefaultMessages: Record<IpcErrorCode, string> = {
  NOT_FOUND: 'Recurso não encontrado.',
  VALIDATION: 'Dados inválidos.',
  NOT_CONFIGURED: 'Configuração pendente.',
  UNSUPPORTED_PLATFORM: 'Plataforma não suportada.',
  PROVIDER_FAILED: 'Falha ao consultar o provider.',
  PERSIST_FAILED: 'Não foi possível gravar os arquivos.',
  INTERNAL: 'Erro interno.',
};

export const IpcMessages = {
  channelNotAllowed: 'Canal IPC não permitido',
  eventNotAllowed: 'Evento IPC não permitido',
  channelNotDeclared: 'Canal IPC não declarado em IpcChannels',
  channelAlreadyRegistered: 'Canal IPC já registrado',
} as const;

/** Erro com código. Lançado por services/handlers e pelo cliente do renderer. */
export class IpcError extends Error {
  constructor(
    readonly code: IpcErrorCode,
    message?: string,
  ) {
    super(message?.trim() ? message : IpcDefaultMessages[code]);
    this.name = 'IpcError';
  }
}
