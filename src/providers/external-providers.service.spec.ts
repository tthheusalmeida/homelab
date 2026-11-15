import * as path from 'node:path';

import { IpcError } from '../shared/errors';
import { JsonFile } from '../settings/json-file';
import { SecretStore, type SecretCipher } from '../settings/secret-store';
import { makeTempDir, removeDir } from '../settings/settings.testing';

import { ExternalProvidersService } from './external-providers.service';
import { createGeminiDefinition } from './gemini.definition';

const cipher: SecretCipher = {
  isAvailable: () => true,
  encrypt: (plain) => `enc:${plain}`,
  decrypt: (encrypted) => encrypted.replace(/^enc:/, ''),
};

describe('ExternalProvidersService', () => {
  let dir: string;
  let secrets: SecretStore;
  const checkKey = jest.fn();

  const create = () => new ExternalProvidersService([createGeminiDefinition(checkKey)], secrets);

  beforeEach(() => {
    dir = makeTempDir();
    secrets = new SecretStore(new JsonFile(path.join(dir, 'k.json')), cipher);
    checkKey.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => removeDir(dir));

  it('when no key was saved, should list gemini as not configured without a masked key', () => {
    expect(create().list()).toEqual([
      { id: 'gemini', label: 'Gemini', configured: false, maskedKey: null },
    ]);
  });

  it('when a key is saved, should list it configured with the key masked, never in clear', () => {
    const service = create();

    service.save('gemini', 'AIzaSyABCDEFGH1234');

    const [info] = service.list();
    expect(info).toEqual({
      id: 'gemini',
      label: 'Gemini',
      configured: true,
      maskedKey: '••••••••1234',
    });
    expect(JSON.stringify(info)).not.toContain('AIzaSyABCDEFGH');
  });

  it('when saving a new key, should require restart; saving the same key again should not', () => {
    const service = create();

    expect(service.save('gemini', 'chave-longa-123').restartRequired).toBe(true);
    expect(service.save('gemini', 'chave-longa-123').restartRequired).toBe(false);
  });

  it('when saving a key with surrounding spaces, should trim it', () => {
    create().save('gemini', '  chave-longa-123  ');

    expect(secrets.get('gemini.apiKey')).toBe('chave-longa-123');
  });

  it('when saving a blank key, should reject with VALIDATION', () => {
    expect(() => create().save('gemini', '   ')).toThrow(IpcError);
    expect(secrets.has('gemini.apiKey')).toBe(false);
  });

  it('when the provider id is unknown, should throw NOT_FOUND', () => {
    expect(() => create().get('openai' as never)).toThrow(/não encontrado: openai/);
  });

  it('when testing with a candidate key, should test that key and not the saved one', async () => {
    const service = create();
    service.save('gemini', 'chave-salva-123');

    await expect(service.test('gemini', 'chave-nova-456')).resolves.toMatchObject({ ok: true });
    expect(checkKey).toHaveBeenCalledWith('chave-nova-456');
  });

  it('when testing without a candidate key, should test the saved key', async () => {
    const service = create();
    service.save('gemini', 'chave-salva-123');

    await service.test('gemini');

    expect(checkKey).toHaveBeenCalledWith('chave-salva-123');
  });

  it('when there is no key to test, should answer not ok without calling the provider', async () => {
    await expect(create().test('gemini')).resolves.toEqual({
      ok: false,
      message: 'Informe a chave da API.',
    });
    expect(checkKey).not.toHaveBeenCalled();
  });

  it('when the connection check fails, should answer not ok with the reason instead of throwing', async () => {
    checkKey.mockRejectedValue(new Error('API key not valid'));

    await expect(create().test('gemini', 'ruim')).resolves.toEqual({
      ok: false,
      message: 'Falha ao conectar ao Gemini: API key not valid',
    });
  });
});
