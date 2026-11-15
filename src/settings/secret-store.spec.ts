import * as path from 'node:path';

import { IpcError } from '../shared/errors';

import { JsonFile } from './json-file';
import { fakeCipher } from './secret-cipher.testing';
import { maskSecret, SecretStore, type SecretCipher } from './secret-store';
import { makeTempDir, removeDir } from './settings.testing';

describe('SecretStore', () => {
  let dir: string;
  let target: string;

  beforeEach(() => {
    dir = makeTempDir();
    target = path.join(dir, 'secrets.json');
  });

  afterEach(() => removeDir(dir));

  it('when nothing was saved, should report no key and read null', async () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher());

    expect(store.has('gemini.apiKey')).toBe(false);
    await expect(store.get('gemini.apiKey')).resolves.toBeNull();
  });

  it('when saving a secret, should read it back decrypted', async () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher());

    await store.set('gemini.apiKey', 'AIza-segredo');

    expect(store.has('gemini.apiKey')).toBe(true);
    await expect(store.get('gemini.apiKey')).resolves.toBe('AIza-segredo');
  });

  it('when saving a secret, should never write it as plain text on disk', async () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher());

    await store.set('gemini.apiKey', 'AIza-segredo');

    expect(new JsonFile(target).exists()).toBe(true);
    expect(JSON.stringify(new JsonFile(target).read())).not.toContain('AIza-segredo');
  });

  it('when encryption is unavailable, should refuse to save and write nothing', async () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher({ available: false }));

    await expect(store.set('gemini.apiKey', 'x')).rejects.toBeInstanceOf(IpcError);
    expect(new JsonFile(target).exists()).toBe(false);
  });

  it('when the stored secret cannot be decrypted, should read null instead of throwing', async () => {
    new JsonFile(target).write({ 'gemini.apiKey': 'lixo' });
    const cipher: SecretCipher = {
      ...fakeCipher(),
      decrypt: () => Promise.reject(new Error('falha ao decifrar')),
    };

    await expect(
      new SecretStore(new JsonFile(target), cipher).get('gemini.apiKey'),
    ).resolves.toBeNull();
  });

  it('when the system asks to re-encrypt, should rewrite the secret and still return its value', async () => {
    const cipher = fakeCipher({ shouldReEncrypt: true });
    new JsonFile(target).write({ 'gemini.apiKey': Buffer.from('AIza-antiga').toString('base64') });

    const value = await new SecretStore(new JsonFile(target), cipher).get('gemini.apiKey');

    expect(value).toBe('AIza-antiga');
    expect(cipher.encryptions).toBe(1);
  });

  it('when re-encrypting fails, should still return the value read with the old key', async () => {
    const cipher: SecretCipher = {
      ...fakeCipher({ shouldReEncrypt: true }),
      encrypt: () => Promise.reject(new Error('sem chave nova')),
    };
    new JsonFile(target).write({ 'gemini.apiKey': Buffer.from('AIza-antiga').toString('base64') });

    await expect(new SecretStore(new JsonFile(target), cipher).get('gemini.apiKey')).resolves.toBe(
      'AIza-antiga',
    );
  });

  it('when no re-encryption is needed, should not rewrite the secret', async () => {
    const cipher = fakeCipher();
    const store = new SecretStore(new JsonFile(target), cipher);
    await store.set('gemini.apiKey', 'AIza-x');

    await store.get('gemini.apiKey');

    expect(cipher.encryptions).toBe(1);
  });
});

describe('maskSecret', () => {
  it('when the secret is long, should show only the last 4 characters', () => {
    expect(maskSecret('AIzaSyABCDEFGH1234')).toBe('••••••••1234');
  });

  it('when the secret is short, should hide it completely', () => {
    expect(maskSecret('abcd')).toBe('••••••••');
    expect(maskSecret('12345678')).toBe('••••••••');
  });
});
