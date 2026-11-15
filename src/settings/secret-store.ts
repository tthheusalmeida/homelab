import { IpcError, IpcErrorCode } from '../shared/errors';

import type { JsonFile } from './json-file';

export const SecretMessages = {
  cipherUnavailable: 'A criptografia do sistema não está disponível; a chave não foi salva.',
} as const;

/** Criptografia do sistema (no Electron: `safeStorage`). Valores trafegam em base64. */
export interface SecretCipher {
  isAvailable(): boolean;
  encrypt(plain: string): string;
  decrypt(encrypted: string): string;
}

export type SecretKey = 'gemini.apiKey';

type SecretFile = Partial<Record<SecretKey, string>>;

/**
 * Guarda segredos cifrados em `secrets.json`. Nunca grava em texto puro:
 * sem criptografia disponível, recusa salvar.
 */
export class SecretStore {
  constructor(
    private readonly file: JsonFile<SecretFile>,
    private readonly cipher: SecretCipher,
  ) {}

  has(key: SecretKey): boolean {
    return Boolean(this.file.read()?.[key]);
  }

  get(key: SecretKey): string | null {
    const encrypted = this.file.read()?.[key];

    if (!encrypted) {
      return null;
    }

    try {
      return this.cipher.decrypt(encrypted);
    } catch {
      // segredo ilegível (ex.: outro usuário do sistema): conta como não configurado
      return null;
    }
  }

  set(key: SecretKey, value: string): void {
    if (!this.cipher.isAvailable()) {
      throw new IpcError(IpcErrorCode.INTERNAL, SecretMessages.cipherUnavailable);
    }

    this.file.write({ ...this.file.read(), [key]: this.cipher.encrypt(value) });
  }
}

/** Mostra só o final do segredo (ex.: `••••••••abcd`). Segredos curtos ficam totalmente ocultos. */
export function maskSecret(value: string): string {
  const MASK = '••••••••';
  const VISIBLE = 4;

  return value.length > VISIBLE * 2 ? `${MASK}${value.slice(-VISIBLE)}` : MASK;
}
