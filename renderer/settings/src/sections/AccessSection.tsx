import { PlatformLoginsCard } from '../components/PlatformLoginsCard';

/**
 * Configurações > Acessos: os logins que o app guarda para baixar vídeos de sites que exigem conta
 * (cursos, plataformas). Hoje só permite esquecê-los; entrar é feito pelo botão do job que pediu login.
 */
export function AccessSection() {
  return <PlatformLoginsCard />;
}
