import { safeStorage } from 'electron';

import type { SecretCipher } from '../settings/secret-store';

/**
 * Criptografia do sistema (DPAPI no Windows, Keychain no macOS, libsecret no Linux),
 * pela API assíncrona do `safeStorage` (a síncrona está obsoleta no Electron).
 */
export const electronCipher: SecretCipher = {
  isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
  encrypt: async (plain) => (await safeStorage.encryptStringAsync(plain)).toString('base64'),
  decrypt: async (encrypted) => {
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(
      Buffer.from(encrypted, 'base64'),
    );

    return { value: result, shouldReEncrypt };
  },
};
