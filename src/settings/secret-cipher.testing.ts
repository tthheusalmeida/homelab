import type { SecretCipher } from './secret-store';

/**
 * Cifrador falso para testes: base64 do texto (nada legível em claro no arquivo),
 * com chaves de disponibilidade e de rotação controláveis.
 */
export function fakeCipher(
  options: { available?: boolean; shouldReEncrypt?: boolean } = {},
): SecretCipher & { encryptions: number } {
  const { available = true, shouldReEncrypt = false } = options;

  const cipher = {
    encryptions: 0,
    isAvailable: () => Promise.resolve(available),
    encrypt: (plain: string) => {
      cipher.encryptions += 1;

      return Promise.resolve(Buffer.from(plain).toString('base64'));
    },
    decrypt: (encrypted: string) =>
      Promise.resolve({
        value: Buffer.from(encrypted, 'base64').toString(),
        shouldReEncrypt,
      }),
  };

  return cipher;
}
