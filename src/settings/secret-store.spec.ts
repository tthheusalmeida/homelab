import * as path from 'node:path';

import { IpcError } from '../shared/errors';

import { JsonFile } from './json-file';
import { maskSecret, SecretStore, type SecretCipher } from './secret-store';
import { makeTempDir, removeDir } from './settings.testing';

const fakeCipher = (available = true): SecretCipher => ({
  isAvailable: () => available,
  encrypt: (plain) => Buffer.from(`enc:${plain}`).toString('base64'),
  decrypt: (encrypted) => Buffer.from(encrypted, 'base64').toString().replace(/^enc:/, ''),
});

describe('SecretStore', () => {
  let dir: string;
  let target: string;

  beforeEach(() => {
    dir = makeTempDir();
    target = path.join(dir, 'secrets.json');
  });

  afterEach(() => removeDir(dir));

  it('when nothing was saved, should report no key and read null', () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher());

    expect(store.has('gemini.apiKey')).toBe(false);
    expect(store.get('gemini.apiKey')).toBeNull();
  });

  it('when saving a secret, should read it back decrypted', () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher());

    store.set('gemini.apiKey', 'AIza-segredo');

    expect(store.has('gemini.apiKey')).toBe(true);
    expect(store.get('gemini.apiKey')).toBe('AIza-segredo');
  });

  it('when saving a secret, should never write it as plain text on disk', () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher());

    store.set('gemini.apiKey', 'AIza-segredo');

    expect(new JsonFile(target).exists()).toBe(true);
    expect(JSON.stringify(new JsonFile(target).read())).not.toContain('AIza-segredo');
  });

  it('when encryption is unavailable, should refuse to save and write nothing', () => {
    const store = new SecretStore(new JsonFile(target), fakeCipher(false));

    expect(() => store.set('gemini.apiKey', 'x')).toThrow(IpcError);
    expect(new JsonFile(target).exists()).toBe(false);
  });

  it('when the stored secret cannot be decrypted, should read null instead of throwing', () => {
    new JsonFile(target).write({ 'gemini.apiKey': 'lixo' });
    const cipher: SecretCipher = {
      ...fakeCipher(),
      decrypt: () => {
        throw new Error('falha ao decifrar');
      },
    };

    expect(new SecretStore(new JsonFile(target), cipher).get('gemini.apiKey')).toBeNull();
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
