import { ComponentOcrPacks, OcrPackMessages, type OcrComponents } from './ocr-language-packs';

function setup(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const failures = new Map<string, string>();
  const install = jest.fn(async (ids: string[]) => {
    for (const id of ids) {
      if (!failures.has(id)) {
        files.set(id, `/models/${id}`);
      }
    }
  });
  const components = {
    install,
    whenIdle: jest.fn().mockResolvedValue(undefined),
    fileOf: (id: string) => files.get(id) ?? null,
    failureOf: (id: string) => failures.get(id) ?? null,
  } as unknown as OcrComponents;

  return { packs: new ComponentOcrPacks(components), install, failures, files };
}

describe('ComponentOcrPacks', () => {
  describe('locate', () => {
    it('when only the fast data is installed, should use it', () => {
      const { packs } = setup({ 'ocr-por-fast': '/m/por-fast' });

      expect(packs.locate('por')).toEqual({ file: '/m/por-fast', quality: 'fast' });
    });

    it('when both qualities are installed, should prefer the high quality one', () => {
      const { packs } = setup({ 'ocr-por-fast': '/m/f', 'ocr-por-best': '/m/b' });

      expect(packs.locate('por')).toEqual({ file: '/m/b', quality: 'best' });
    });

    it('when the language is not installed, should return null', () => {
      expect(setup().packs.locate('fra')).toBeNull();
    });
  });

  describe('ensure', () => {
    it('when the languages are installed, should not download anything', async () => {
      const { packs, install } = setup({ 'ocr-por-best': '/m/b', 'ocr-eng-fast': '/m/e' });

      await packs.ensure(['por', 'eng']);

      expect(install).not.toHaveBeenCalled();
    });

    it('when a language is missing, should install its fast data and wait for the installation to end', async () => {
      const { packs, install } = setup({ 'ocr-por-fast': '/m/p' });

      await packs.ensure(['por', 'fra']);

      expect(install).toHaveBeenCalledWith(['ocr-fra-fast']);
      expect(packs.locate('fra')).toEqual({ file: '/models/ocr-fra-fast', quality: 'fast' });
    });

    it('when the download fails, should throw the reason the installation gave', async () => {
      const { packs, failures } = setup();

      failures.set('ocr-fra-fast', 'O servidor respondeu 404.');

      await expect(packs.ensure(['fra'])).rejects.toThrow('O servidor respondeu 404.');
    });

    it('when the installation ends without the file and without a reason, should throw a generic message', async () => {
      const silent = new ComponentOcrPacks({
        install: jest.fn().mockResolvedValue(undefined),
        whenIdle: jest.fn().mockResolvedValue(undefined),
        fileOf: () => null,
        failureOf: () => null,
      } as unknown as OcrComponents);

      await expect(silent.ensure(['fra'])).rejects.toThrow(OcrPackMessages.failed);
    });

    it('when another installation is running, should pass the error on', async () => {
      const { packs, install } = setup();

      install.mockRejectedValue(new Error('Já existe uma instalação em andamento.'));

      await expect(packs.ensure(['fra'])).rejects.toThrow('instalação em andamento');
    });
  });
});
