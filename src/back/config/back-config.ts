/**
 * Configuração que os services do back precisam, já tipada (substitui o `AppConfig` do `.env`).
 * É a ponte entre o back e o Settings/Secrets do desktop (ver `settings/settings-back-config.ts`);
 * nos testes basta passar um objeto com os campos usados.
 *
 * Os services leem os valores **uma vez**, ao serem criados; mudar configuração exige reiniciar o app.
 */
export abstract class BackConfig {
  /** Pasta da biblioteca (documentos publicados e arquivados). */
  abstract readonly libraryDir: string;

  /** Pasta de entrada (documentos pendentes gerados pelos jobs). */
  abstract readonly inboxDir: string;

  abstract readonly videoTempDir: string;

  abstract readonly audioTempDir: string;

  abstract readonly ollamaUrl: string;

  /** Arquivo onde o consumo de IA fica guardado entre execuções; `null` guarda só em memória (testes). */
  abstract readonly usageFile: string | null;

  /** Chave do Gemini; `null` quando não configurada (o provider responde `NOT_CONFIGURED`). */
  abstract readonly geminiApiKey: string | null;
}
