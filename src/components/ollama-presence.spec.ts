import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ManifestPresence, TagsPresence } from './ollama-presence';

describe('TagsPresence', () => {
  it('when the server lists the model, should know it is installed after refreshing', async () => {
    const presence = new TagsPresence(async () => ['qwen3.5:4b']);

    expect(presence.has('qwen3.5:4b')).toBe(false);
    await presence.refresh();

    expect(presence.has('qwen3.5:4b')).toBe(true);
    expect(presence.has('qwen3.5:9b')).toBe(false);
  });

  it('when the reference has no tag, should match the latest one', async () => {
    const presence = new TagsPresence(async () => ['embeddinggemma:latest']);

    await presence.refresh();

    expect(presence.has('embeddinggemma')).toBe(true);
  });

  it('when the server is off, should say nothing is installed', async () => {
    const names: Array<string[] | null> = [['qwen3.5:4b'], null];
    const presence = new TagsPresence(async () => names.shift() ?? null);

    await presence.refresh();
    await presence.refresh();

    expect(presence.has('qwen3.5:4b')).toBe(false);
  });
});

describe('ManifestPresence', () => {
  it('when the manifest file exists, should say installed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'presence-'));
    const manifest = path.join(dir, 'manifests', 'registry.ollama.ai', 'library', 'qwen3.5', '4b');

    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    fs.writeFileSync(manifest, '{}');

    expect(new ManifestPresence(dir).has('qwen3.5:4b')).toBe(true);
    expect(new ManifestPresence(dir).has('qwen3.5:9b')).toBe(false);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
