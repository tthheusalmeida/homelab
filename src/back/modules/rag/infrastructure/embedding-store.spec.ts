import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { EmbeddingStore } from './embedding-store';

describe('EmbeddingStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'embeddings-'));
    file = path.join(dir, 'cache', 'embeddings.json');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when saved and opened again with the same model, should bring the vectors back', async () => {
    const store = new EmbeddingStore(file, 'm');

    store.set('a', new Float32Array([0.5, 0.25]));
    await store.save();

    const again = new EmbeddingStore(file, 'm');

    expect(Array.from(again.get('a')!)).toEqual([0.5, 0.25]);
  });

  it('when the file belongs to another model, should start empty', async () => {
    const store = new EmbeddingStore(file, 'antigo');

    store.set('a', new Float32Array([1]));
    await store.save();

    expect(new EmbeddingStore(file, 'novo').size).toBe(0);
  });

  it('when the file is unreadable, should start empty', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{ quebrado');

    expect(new EmbeddingStore(file, 'm').size).toBe(0);
  });

  it('when keys are retained, should forget the others', () => {
    const store = new EmbeddingStore(null, 'm');

    store.set('a', new Float32Array([1]));
    store.set('b', new Float32Array([1]));
    store.retain(new Set(['a']));

    expect(store.get('b')).toBeUndefined();
    expect(store.get('a')).toBeDefined();
  });

  it('when there is no file, should work in memory only', async () => {
    const store = new EmbeddingStore(null, 'm');

    store.set('a', new Float32Array([1]));

    await expect(store.save()).resolves.toBeUndefined();
  });
});
