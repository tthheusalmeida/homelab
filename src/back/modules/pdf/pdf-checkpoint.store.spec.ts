import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { PdfChunk } from './pdf-chunker';
import { checkpointKey, PdfCheckpointStore, type CheckpointParams } from './pdf-checkpoint.store';

const params: CheckpointParams = { providerId: 'gemini', modelId: 'm1', detail: 'detailed' };

const chunks: PdfChunk[] = [
  { index: 0, startPage: 1, endPage: 2, text: 'texto da parte um' },
  { index: 1, startPage: 3, endPage: 3, text: 'texto da parte dois' },
  { index: 2, startPage: 4, endPage: 6, text: 'texto da parte três' },
];

const info = { fileName: 'Livro.pdf', pageCount: 6, params };

describe('checkpointKey', () => {
  it('when text and settings are the same, should give the same key', () => {
    expect(checkpointKey(chunks, params)).toBe(checkpointKey([...chunks], { ...params }));
  });

  it('when the key is built, should be 24 hex characters', () => {
    expect(PdfCheckpointStore.isValidKey(checkpointKey(chunks, params))).toBe(true);
  });

  it.each([
    ['the model', { ...params, modelId: 'm2' }],
    ['the provider', { ...params, providerId: 'ollama' }],
    ['the thinking', { ...params, thinking: 'on' }],
  ])('when %s changes, should keep the same key so the work continues', (_name, other) => {
    expect(checkpointKey(chunks, other)).toBe(checkpointKey(chunks, params));
  });

  it('when the detail level changes, should give another key (levels are not mixed)', () => {
    expect(checkpointKey(chunks, { ...params, detail: 'brief' })).not.toBe(
      checkpointKey(chunks, params),
    );
  });

  it('when the text changes, should give another key', () => {
    const changed = [{ ...chunks[0], text: 'outro texto' }, ...chunks.slice(1)];

    expect(checkpointKey(changed, params)).not.toBe(checkpointKey(chunks, params));
  });

  it('when the same text is split on other pages, should give another key', () => {
    const moved = [{ ...chunks[0], endPage: 9 }, ...chunks.slice(1)];

    expect(checkpointKey(moved, params)).not.toBe(checkpointKey(chunks, params));
  });
});

describe('PdfCheckpointStore', () => {
  let dir: string;
  let store: PdfCheckpointStore;
  let key: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-checkpoint-'));
    store = new PdfCheckpointStore(dir);
    key = checkpointKey(chunks, params);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('when creating, should write the manifest and the text of every part to disk', async () => {
    const manifest = await store.create(key, info, chunks);

    expect(manifest.parts).toEqual([
      { index: 0, startPage: 1, endPage: 2, chars: 17 },
      { index: 1, startPage: 3, endPage: 3, chars: 19 },
      { index: 2, startPage: 4, endPage: 6, chars: 19 },
    ]);
    expect(fs.existsSync(path.join(dir, key, 'manifest.json'))).toBe(true);
    await expect(store.readPart(key, 1)).resolves.toBe('texto da parte dois');
  });

  it('when loading, should answer the manifest that was written', async () => {
    await store.create(key, info, chunks);

    const manifest = await store.load(key);

    expect(manifest).toMatchObject({ key, fileName: 'Livro.pdf', pageCount: 6, params });
  });

  it('when the folder does not exist, should answer null', async () => {
    await expect(store.load(key)).resolves.toBeNull();
    await expect(store.progress(key)).resolves.toBeNull();
    expect(store.progressSync(key)).toBeNull();
  });

  it('when the manifest is unreadable, should answer null instead of failing', async () => {
    await store.create(key, info, chunks);
    fs.writeFileSync(path.join(dir, key, 'manifest.json'), '{ quebrado');

    await expect(store.load(key)).resolves.toBeNull();
    expect(store.progressSync(key)).toBeNull();
  });

  it('when the manifest has another version, should answer null', async () => {
    await store.create(key, info, chunks);
    const file = path.join(dir, key, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf-8'));

    fs.writeFileSync(file, JSON.stringify({ ...manifest, version: 99 }));

    await expect(store.load(key)).resolves.toBeNull();
  });

  it('when no part is summarized yet, should report zero done', async () => {
    await store.create(key, info, chunks);

    await expect(store.progress(key)).resolves.toEqual({ done: 0, total: 3 });
    expect(store.progressSync(key)).toEqual({ done: 0, total: 3 });
  });

  it('when summaries are saved, should read them back and count them as done', async () => {
    await store.create(key, info, chunks);

    await store.saveSummary(key, 0, '## resumo 1');
    await store.saveSummary(key, 2, '## resumo 3');

    await expect(store.readSummary(key, 0)).resolves.toBe('## resumo 1');
    await expect(store.readSummary(key, 1)).resolves.toBeNull();
    await expect(store.progress(key)).resolves.toEqual({ done: 2, total: 3 });
    expect(store.progressSync(key)).toEqual({ done: 2, total: 3 });
  });

  it('when a summary file is empty, should treat the part as not done', async () => {
    await store.create(key, info, chunks);
    fs.writeFileSync(path.join(dir, key, 'summary-0000.md'), '  \n');

    await expect(store.readSummary(key, 0)).resolves.toBeNull();
    await expect(store.progress(key)).resolves.toEqual({ done: 0, total: 3 });
    expect(store.progressSync(key)).toEqual({ done: 0, total: 3 });
  });

  it('when a summary is saved, should leave no temporary file behind', async () => {
    await store.create(key, info, chunks);

    await store.saveSummary(key, 0, 'ok');

    expect(fs.readdirSync(path.join(dir, key)).some((name) => name.endsWith('.tmp'))).toBe(false);
  });

  it('when creating again for the same work, should keep the summaries already done', async () => {
    await store.create(key, info, chunks);
    await store.saveSummary(key, 1, '## pronto');

    await store.create(key, info, chunks);

    await expect(store.readSummary(key, 1)).resolves.toBe('## pronto');
    await expect(store.progress(key)).resolves.toEqual({ done: 1, total: 3 });
  });

  it('when the page data was not saved yet, should answer null', async () => {
    await store.create(key, info, chunks);

    await expect(store.readPage(key)).resolves.toBeNull();
  });

  it('when the page data is saved, should read it back and keep it across a new create', async () => {
    await store.create(key, info, chunks);
    const page = { title: 'Redes', category: ['Tecnologia'], tags: ['redes'] };

    await store.savePage(key, page);
    await store.create(key, info, chunks);

    await expect(store.readPage(key)).resolves.toEqual(page);
  });

  it('when the page file is broken or incomplete, should answer null', async () => {
    await store.create(key, info, chunks);

    fs.writeFileSync(path.join(dir, key, 'page.json'), '{ quebrado');
    await expect(store.readPage(key)).resolves.toBeNull();

    fs.writeFileSync(path.join(dir, key, 'page.json'), JSON.stringify({ title: 'x' }));
    await expect(store.readPage(key)).resolves.toBeNull();
  });

  it('when the page data is saved, should not count it as a part summary', async () => {
    await store.create(key, info, chunks);

    await store.savePage(key, { title: 'x', category: [], tags: [] });

    await expect(store.progress(key)).resolves.toEqual({ done: 0, total: 3 });
    expect(store.progressSync(key)).toEqual({ done: 0, total: 3 });
  });

  it('when removing, should delete the whole folder and accept a missing one', async () => {
    await store.create(key, info, chunks);

    await store.remove(key);
    await store.remove(key);

    expect(fs.existsSync(path.join(dir, key))).toBe(false);
  });

  it.each(['../fora', 'abc', 'A'.repeat(24), 'a/b'.padEnd(24, 'a')])(
    'when the key is not valid (%s), should refuse before touching the disk',
    async (bad) => {
      expect(PdfCheckpointStore.isValidKey(bad)).toBe(false);
      await expect(store.readPart(bad, 0)).rejects.toThrow('Chave de progresso inválida');
      expect(store.progressSync(bad)).toBeNull();
    },
  );

  describe('removeStale', () => {
    const DAY = 24 * 60 * 60 * 1000;

    it('when a folder has not been used for long, should delete only that one', async () => {
      const oldKey = 'a'.repeat(24);
      const freshKey = 'b'.repeat(24);

      await store.create(oldKey, info, chunks);
      await store.create(freshKey, info, chunks);

      // sem nenhuma pasta antiga, nada sai
      await expect(store.removeStale()).resolves.toBe(0);

      const old = new Date(Date.now() - 40 * DAY);

      fs.utimesSync(path.join(dir, oldKey), old, old);

      await expect(store.removeStale()).resolves.toBe(1);
      expect(fs.existsSync(path.join(dir, oldKey))).toBe(false);
      expect(fs.existsSync(path.join(dir, freshKey))).toBe(true);
    });

    it('when the base folder does not exist, should delete nothing and not fail', async () => {
      await expect(
        new PdfCheckpointStore(path.join(dir, 'nao-existe')).removeStale(),
      ).resolves.toBe(0);
    });

    it('when there are files or folders with other names, should leave them alone', async () => {
      fs.mkdirSync(path.join(dir, 'minha-pasta'));
      fs.writeFileSync(path.join(dir, 'arquivo.txt'), 'x');
      const old = new Date(Date.now() - 400 * DAY);

      fs.utimesSync(path.join(dir, 'minha-pasta'), old, old);

      await expect(store.removeStale()).resolves.toBe(0);
      expect(fs.existsSync(path.join(dir, 'minha-pasta'))).toBe(true);
    });
  });
});
