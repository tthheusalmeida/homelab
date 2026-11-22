import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { BackAlerts } from '../../../config/back-alerts';
import type { BackConfig } from '../../../config/back-config';

import { PromptStore, sanitizePrompts } from './prompt.store';

const config = (promptsFile: string | null) => ({ promptsFile }) as BackConfig;

const stored = {
  activeId: 'v1',
  versions: [{ id: 'v1', name: 'Curto', text: 'Instruções curtas para o mapa mental.' }],
};

describe('PromptStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompts-'));
    file = path.join(dir, 'config', 'prompts.json');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when nothing was saved, should return an empty prompt in the default', () => {
    expect(new PromptStore(config(file)).get('mindMap')).toEqual({ activeId: null, versions: [] });
  });

  it('when a prompt is saved, should read it back and keep it on disk across instances', () => {
    new PromptStore(config(file)).set('mindMap', stored);

    expect(new PromptStore(config(file)).get('mindMap')).toEqual(stored);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('when reading, should hand out a copy that does not change the stored data', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', stored);
    store.get('mindMap').versions.push({ id: 'x', name: 'x', text: 'x' });

    expect(store.get('mindMap').versions).toHaveLength(1);
  });

  it('when a prompt goes back to the default with no versions, should drop it from the file', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', stored);
    store.set('mindMap', { activeId: null, versions: [] });

    expect(new PromptStore(config(file)).exportAll()).toEqual([]);
  });

  it('when there is no config path, should keep the prompts only in memory', () => {
    const store = new PromptStore(config(null));

    store.set('mindMap', stored);

    expect(store.get('mindMap')).toEqual(stored);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('when the file is unreadable and there is no backup, should fall back to the default', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{ quebrado');

    expect(new PromptStore(config(file)).get('mindMap')).toEqual({ activeId: null, versions: [] });
  });

  it('when writing to disk fails, should keep the prompt in memory and warn', () => {
    const persistFailed = jest.fn();

    // o "arquivo" fica dentro de um arquivo comum: criar a pasta falha
    fs.writeFileSync(path.join(dir, 'ocupado'), 'x');

    const store = new PromptStore(config(path.join(dir, 'ocupado', 'prompts.json')), {
      persistFailed,
    } as unknown as BackAlerts);

    store.set('mindMap', stored);

    expect(store.get('mindMap')).toEqual(stored);
    expect(persistFailed).toHaveBeenCalledWith('os prompts', expect.any(String));
  });

  it('when exporting, should list each stored prompt with its kind', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', stored);

    expect(store.exportAll()).toEqual([{ kind: 'mindMap', prompt: stored }]);
  });
});

describe('sanitizePrompts', () => {
  it('when versions are malformed, should drop only the bad ones', () => {
    const result = sanitizePrompts({
      mindMap: {
        activeId: 'ok',
        versions: [
          { id: 'ok', name: 'N', text: 'T' },
          { id: 1 },
          null,
          { id: '', name: 'a', text: 'b' },
        ],
      },
    });

    expect(result.mindMap?.versions).toEqual([{ id: 'ok', name: 'N', text: 'T' }]);
    expect(result.mindMap?.activeId).toBe('ok');
  });

  it('when the active id points to a missing version, should go back to the default', () => {
    const result = sanitizePrompts({
      mindMap: { activeId: 'sumiu', versions: [{ id: 'a', name: 'N', text: 'T' }] },
    });

    expect(result.mindMap?.activeId).toBeNull();
  });

  it('when the kind is unknown or the data is not an object, should ignore it', () => {
    expect(sanitizePrompts({ desconhecido: { activeId: null, versions: [] } })).toEqual({});
    expect(sanitizePrompts('lixo')).toEqual({});
    expect(sanitizePrompts(null)).toEqual({});
  });
});
