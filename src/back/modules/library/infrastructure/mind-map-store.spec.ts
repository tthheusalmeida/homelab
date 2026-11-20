import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { BackAlerts } from '../../../config/back-alerts';
import type { BackConfig } from '../../../config/back-config';

import type { StoredMindMap } from '../domain/mind-map';

import { MindMapStore } from './mind-map-store';

const map: StoredMindMap = {
  contentHash: 'h1',
  model: 'gemini-x',
  createdAt: '2026-11-19T10:00:00.000Z',
  nodes: [{ label: 'A', children: [] }],
};

const config = (mindMapsFile: string | null) => ({ mindMapsFile }) as BackConfig;

describe('MindMapStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mind-maps-'));
    file = path.join(dir, 'data', 'mind-maps.json');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when no map was saved, should return undefined', () => {
    expect(new MindMapStore(config(file)).get('1')).toBeUndefined();
  });

  it('when a map is saved, should read it back and keep it on disk across instances', () => {
    new MindMapStore(config(file)).set('1', map);

    expect(new MindMapStore(config(file)).get('1')).toEqual(map);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('when a map is saved again for the same page, should replace the old one', () => {
    const store = new MindMapStore(config(file));

    store.set('1', map);
    store.set('1', { ...map, model: 'outro' });

    expect(new MindMapStore(config(file)).get('1')?.model).toBe('outro');
  });

  it('when a map is deleted, should be gone from disk too', () => {
    const store = new MindMapStore(config(file));

    store.set('1', map);
    store.delete('1');

    expect(new MindMapStore(config(file)).get('1')).toBeUndefined();
  });

  it('when the file has no config path, should keep maps only in memory', () => {
    const store = new MindMapStore(config(null));

    store.set('1', map);

    expect(store.get('1')).toEqual(map);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('when the file is unreadable and there is no backup, should start empty', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{ quebrado');

    expect(new MindMapStore(config(file)).get('1')).toBeUndefined();
  });

  it('when writing to disk fails, should keep the map in memory and warn', () => {
    const persistFailed = jest.fn();
    // o "arquivo" fica dentro de um arquivo comum: criar a pasta falha
    fs.writeFileSync(path.join(dir, 'ocupado'), 'x');
    const store = new MindMapStore(config(path.join(dir, 'ocupado', 'mind-maps.json')), {
      persistFailed,
    } as unknown as BackAlerts);

    store.set('1', map);

    expect(store.get('1')).toEqual(map);
    expect(persistFailed).toHaveBeenCalledWith('os mapas mentais', expect.any(String));
  });

  describe('backup', () => {
    it('when exporting, should list every map with the id of its page', () => {
      const store = new MindMapStore(config(file));

      store.set('1', map);
      store.set('2', { ...map, edited: true });

      expect(store.exportAll()).toEqual([
        { id: '1', map },
        { id: '2', map: { ...map, edited: true } },
      ]);
    });

    it('when exporting, should hand out copies (changing them does not change the store)', () => {
      const store = new MindMapStore(config(file));

      store.set('1', map);
      store.exportAll()[0].map.nodes.length = 0;

      expect(store.get('1')?.nodes).toHaveLength(1);
    });

    it('when merging, should add only the pages without a map and keep the current one (with its edits)', () => {
      const store = new MindMapStore(config(file));
      const edited = { ...map, edited: true, model: 'usuario' };

      store.set('1', edited);

      const result = store.importAll(
        [
          { id: '1', map },
          { id: '2', map },
        ],
        'merge',
      );

      expect(result).toEqual({ added: 1, skipped: 1 });
      expect(store.get('1')).toEqual(edited);
      expect(store.get('2')).toEqual(map);
    });

    it('when replacing, should drop every current map and keep only the ones from the backup', () => {
      const store = new MindMapStore(config(file));

      store.set('1', { ...map, edited: true });
      store.set('9', map);

      const result = store.importAll([{ id: '1', map }], 'replace');

      expect(result).toEqual({ added: 1, skipped: 0 });
      expect(store.get('1')).toEqual(map);
      expect(store.get('9')).toBeUndefined();
    });

    it('when the backup has invalid entries, should ignore them and count them as skipped', () => {
      const store = new MindMapStore(config(file));

      const result = store.importAll(
        [
          null,
          'x',
          { id: '', map },
          { id: '1' },
          { id: '2', map: { nodes: 'x' } },
          { id: '3', map },
        ],
        'merge',
      );

      expect(result).toEqual({ added: 1, skipped: 5 });
      expect(store.get('3')).toEqual(map);
    });

    it('when importing, should write the result to disk so it survives a restart', () => {
      new MindMapStore(config(file)).importAll([{ id: '1', map }], 'merge');

      expect(new MindMapStore(config(file)).get('1')).toEqual(map);
    });
  });
});
