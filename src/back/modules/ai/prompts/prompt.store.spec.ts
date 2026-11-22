import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PROMPT_LIMITS } from '../../../../shared/contracts/prompts';
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

  it('when exporting, should list one record per version with its kind and whether it is in use', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', {
      activeId: 'v1',
      versions: [...stored.versions, { id: 'v2', name: 'Longo', text: text('longo') }],
    });

    expect(store.exportAll()).toEqual([
      { kind: 'mindMap', id: 'v1', name: 'Curto', text: stored.versions[0].text, active: true },
      { kind: 'mindMap', id: 'v2', name: 'Longo', text: text('longo'), active: false },
    ]);
  });
});

const text = (suffix: string) => `Instruções do usuário para o mapa mental, versão ${suffix}.`;

const record = (overrides: Record<string, unknown> = {}) => ({
  kind: 'mindMap',
  id: 'r1',
  name: 'Do backup',
  text: text('backup'),
  active: false,
  ...overrides,
});

describe('PromptStore import', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompts-import-'));
    file = path.join(dir, 'config', 'prompts.json');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when merging, should add only the versions whose name is new and keep the one in use', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', stored);

    const result = store.importAll(
      [record({ id: 'a', name: 'curto' }), record({ id: 'b', name: 'Novo', active: true })],
      'merge',
    );

    expect(result).toEqual({ added: 1, skipped: 1 });
    expect(store.get('mindMap').versions.map((version) => version.name)).toEqual(['Curto', 'Novo']);
    expect(store.get('mindMap').activeId).toBe('v1');
  });

  it('when merging a version whose id already exists here, should give it a new id', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', {
      activeId: null,
      versions: [{ id: 'r1', name: 'Local', text: text('x') }],
    });
    store.importAll([record({ id: 'r1', name: 'Do backup' })], 'merge');

    const ids = store.get('mindMap').versions.map((version) => version.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('when replacing, should swap everything and use the version marked as active', () => {
    const store = new PromptStore(config(file));

    store.set('mindMap', stored);
    store.set('infographic', stored);

    const result = store.importAll([record({ id: 'a', active: true })], 'replace');

    expect(result).toEqual({ added: 1, skipped: 0 });
    expect(store.get('mindMap').activeId).toBe('a');
    expect(store.get('infographic')).toEqual({ activeId: null, versions: [] });
  });

  it('when a record is invalid (kind, sizes or shape), should skip it', () => {
    const store = new PromptStore(config(file));

    const result = store.importAll(
      [
        record({ kind: 'desconhecido' }),
        record({ text: 'curto' }),
        record({ name: '   ' }),
        record({ name: 'n'.repeat(PROMPT_LIMITS.maxNameChars + 1) }),
        record({ text: 'x'.repeat(PROMPT_LIMITS.maxChars + 1) }),
        { id: 1 },
        null,
        record({ name: 'Boa' }),
      ],
      'merge',
    );

    expect(result).toEqual({ added: 1, skipped: 7 });
    expect(store.get('mindMap').versions.map((version) => version.name)).toEqual(['Boa']);
  });

  it('when the limit of versions per prompt is reached, should skip the rest', () => {
    const store = new PromptStore(config(file));
    const many = Array.from({ length: PROMPT_LIMITS.maxVersionsPerKind + 3 }, (_, index) =>
      record({ id: `v${index}`, name: `Versão ${index}` }),
    );

    const result = store.importAll(many, 'replace');

    expect(result).toEqual({ added: PROMPT_LIMITS.maxVersionsPerKind, skipped: 3 });
  });

  it('when importing, should keep the result on disk', () => {
    new PromptStore(config(file)).importAll([record({ active: true })], 'replace');

    expect(new PromptStore(config(file)).get('mindMap').activeId).toBe('r1');
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
