import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { BackAlerts } from '../../../config/back-alerts';
import type { BackConfig } from '../../../config/back-config';

import type { StoredInfographic } from '../domain/infographic';

import { InfographicStore } from './infographic-store';

const infographic: StoredInfographic = {
  contentHash: 'h1',
  model: 'gemini-x',
  createdAt: '2026-11-20T10:00:00.000Z',
  title: 'Redes',
  piece: 'tecnologia.wifi',
  sections: [
    {
      layout: 'steps',
      title: 'Passos',
      piece: '',
      items: [
        { piece: 'tecnologia.chip', title: 'A', text: 'a' },
        { piece: 'tecnologia.chip', title: 'B', text: 'b' },
        { piece: 'tecnologia.chip', title: 'C', text: 'c' },
      ],
    },
  ],
};

const config = (infographicsFile: string | null) => ({ infographicsFile }) as BackConfig;

describe('InfographicStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'infographics-'));
    file = path.join(dir, 'data', 'infographics.json');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when nothing was saved, should return undefined', () => {
    expect(new InfographicStore(config(file)).get('1')).toBeUndefined();
  });

  it('when an infographic is saved, should read it back and keep it on disk across instances', () => {
    new InfographicStore(config(file)).set('1', infographic);

    expect(new InfographicStore(config(file)).get('1')).toEqual(infographic);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('when it is saved again for the same page, should replace the old one', () => {
    const store = new InfographicStore(config(file));

    store.set('1', infographic);
    store.set('1', { ...infographic, model: 'outro' });

    expect(new InfographicStore(config(file)).get('1')?.model).toBe('outro');
  });

  it('when it is deleted, should be gone from disk too and leave the others', () => {
    const store = new InfographicStore(config(file));

    store.set('1', infographic);
    store.set('2', infographic);
    store.delete('1');

    const again = new InfographicStore(config(file));

    expect(again.get('1')).toBeUndefined();
    expect(again.get('2')).toEqual(infographic);
  });

  it('when deleting an id that does not exist, should not write the file', () => {
    new InfographicStore(config(file)).delete('x');

    expect(fs.existsSync(file)).toBe(false);
  });

  it('when there is no file in the config, should keep infographics only in memory', () => {
    const store = new InfographicStore(config(null));

    store.set('1', infographic);

    expect(store.get('1')).toEqual(infographic);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('when the file is unreadable and there is no backup, should start empty', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{ quebrado');

    expect(new InfographicStore(config(file)).get('1')).toBeUndefined();
  });

  it('when writing to disk fails, should keep it in memory and warn', () => {
    const persistFailed = jest.fn();

    fs.writeFileSync(path.join(dir, 'ocupado'), 'x');

    const store = new InfographicStore(config(path.join(dir, 'ocupado', 'infographics.json')), {
      persistFailed,
    } as unknown as BackAlerts);

    store.set('1', infographic);

    expect(store.get('1')).toEqual(infographic);
    expect(persistFailed).toHaveBeenCalledWith('os infográficos', expect.any(String));
  });
});
