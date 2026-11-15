import { safeStorage } from 'electron';

import type { SecretCipher } from '../settings/secret-store';

/** Criptografia do sistema (DPAPI no Windows, Keychain no macOS, libsecret no Linux). */
export const electronCipher: SecretCipher = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plain) => safeStorage.encryptString(plain).toString('base64'),
  decrypt: (encrypted) => safeStorage.decryptString(Buffer.from(encrypted, 'base64')),
};
