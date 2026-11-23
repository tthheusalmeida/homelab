import type { ExternalProviderId } from '../shared/contracts/providers';
import { IpcError, IpcErrorCode } from '../shared/errors';

import type { JsonFile } from '../storage/json-file';

export const SecretMessages = {
  cipherUnavailable: 'A criptografia do sistema não está disponível; a chave não foi salva.',
} as const;

/** Resultado de decifrar: `shouldReEncrypt` indica que o sistema trocou a chave e o valor deve ser regravado. */
export interface DecryptedSecret {
  value: string;
  shouldReEncrypt: boolean;
}

/** Criptografia do sistema (no Electron: `safeStorage`, API assíncrona). Valores trafegam em base64. */
export interface SecretCipher {
  isAvailable(): Promise<boolean>;
  encrypt(plain: string): Promise<string>;
  decrypt(encrypted: string): Promise<DecryptedSecret>;
}

/** Chave de API de cada provider externo (`<id>.apiKey`) e os logins de plataformas de vídeo. */
export type SecretKey = `${ExternalProviderId}.apiKey` | 'platform.cookies';

/** Nome do segredo que guarda a chave de API do provider. */
export function apiKeySecret(provider: ExternalProviderId): SecretKey {
  return `${provider}.apiKey`;
}

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

  async get(key: SecretKey): Promise<string | null> {
    const encrypted = this.file.read()?.[key];

    if (!encrypted) {
      return null;
    }

    try {
      const { value, shouldReEncrypt } = await this.cipher.decrypt(encrypted);

      if (shouldReEncrypt) {
        await this.reEncrypt(key, value);
      }

      return value;
    } catch {
      // segredo ilegível (ex.: outro usuário do sistema): conta como não configurado
      return null;
    }
  }

  async set(key: SecretKey, value: string): Promise<void> {
    if (!(await this.cipher.isAvailable())) {
      throw new IpcError(IpcErrorCode.INTERNAL, SecretMessages.cipherUnavailable);
    }

    this.file.write({ ...this.file.read(), [key]: await this.cipher.encrypt(value) });
  }

  /** O sistema trocou a chave de criptografia: regrava o segredo com a nova (falhar aqui não afeta a leitura). */
  private async reEncrypt(key: SecretKey, value: string): Promise<void> {
    try {
      await this.set(key, value);
    } catch {
      // continua válido com a chave antiga
    }
  }
}

/** Mostra só o final do segredo (ex.: `••••••••abcd`). Segredos curtos ficam totalmente ocultos. */
export function maskSecret(value: string): string {
  const MASK = '••••••••';
  const VISIBLE = 4;

  return value.length > VISIBLE * 2 ? `${MASK}${value.slice(-VISIBLE)}` : MASK;
}
