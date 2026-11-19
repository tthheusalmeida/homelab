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
});
