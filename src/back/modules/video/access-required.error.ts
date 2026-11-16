/** Código gravado no job quando o vídeo exige login e o app precisa pedir acesso ao usuário. */
export const ACCESS_REQUIRED_CODE = 'ACCESS_REQUIRED';

export const AccessRequiredMessage =
  'Este vídeo precisa de login. Use “Entrar no site” para liberar o acesso e o app tenta de novo.';

/**
 * O site recusou o download porque o vídeo é privado ou exige login. Não é uma falha comum: o job
 * guarda o endereço e a tela oferece "Entrar no site" para o usuário liberar o acesso.
 */
export class AccessRequiredError extends Error {
  readonly code = ACCESS_REQUIRED_CODE;

  constructor(readonly url: string) {
    super(AccessRequiredMessage);
    this.name = 'AccessRequiredError';
  }
}
