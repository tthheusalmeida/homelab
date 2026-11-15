import * as fs from 'node:fs';
import * as path from 'node:path';

/** Nome do arquivo e da chave onde o Chromium guarda a chave do `safeStorage`. */
export const LOCAL_STATE_FILE = 'Local State';
export const OS_CRYPT_KEY = 'encrypted_key';

export interface LocalStateGuardOptions {
  userDataDir: string;
  /** Tempo máximo de espera, em ms. */
  timeoutMs?: number;
  intervalMs?: number;
  readFile?: (file: string) => string | null;
  sleep?: (ms: number) => Promise<void>;
}

const defaultRead = (file: string): string | null => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

/**
 * O `safeStorage` guarda a chave de criptografia no `Local State` da pasta de dados, e o Chromium
 * só grava esse arquivo ~10 s depois do primeiro uso. Sair antes (`app.exit`) deixa o segredo
 * ilegível no próximo início. Esta classe espera o arquivo conter a chave antes de reiniciar.
 */
export class LocalStateGuard {
  private readonly file: string;
  private readonly timeoutMs: number;
  private readonly intervalMs: number;
  private readonly readFile: (file: string) => string | null;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: LocalStateGuardOptions) {
    this.file = path.join(options.userDataDir, LOCAL_STATE_FILE);
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.intervalMs = options.intervalMs ?? 250;
    this.readFile = options.readFile ?? defaultRead;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  isPersisted(): boolean {
    return this.readFile(this.file)?.includes(`"${OS_CRYPT_KEY}"`) ?? false;
  }

  /** Resolve `true` quando a chave já está no disco e `false` se o tempo acabou antes. */
  async waitUntilPersisted(): Promise<boolean> {
    for (let waited = 0; waited <= this.timeoutMs; waited += this.intervalMs) {
      if (this.isPersisted()) {
        return true;
      }

      await this.sleep(this.intervalMs);
    }

    return false;
  }
}
