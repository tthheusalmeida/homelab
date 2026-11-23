import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { FileJobArtifactStore, MemoryJobArtifactStore } from './job-artifact.store';

describe('FileJobArtifactStore', () => {
  let dir: string;
  let store: FileJobArtifactStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-'));
    store = new FileJobArtifactStore(dir);
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when nothing was saved, should load an empty state', async () => {
    await expect(store.load('j1')).resolves.toEqual({});
  });

  it('when saving in steps, should merge the results and keep them for a new instance', async () => {
    await store.save('j1', { audioPath: '/a.wav' });
    await store.save('j1', { transcript: 'texto' });

    await expect(new FileJobArtifactStore(dir).load('j1')).resolves.toEqual({
      audioPath: '/a.wav',
      transcript: 'texto',
    });
  });

  it('when saving, should name the file after the job id and leave no temporary file', async () => {
    await store.save('j1', { summary: 's' });

    expect(fs.readdirSync(dir)).toEqual(['j1.state.json']);
  });

  it('when the file is corrupted, should load an empty state instead of failing', async () => {
    fs.writeFileSync(path.join(dir, 'j1.state.json'), '{quebrado');

    await expect(store.load('j1')).resolves.toEqual({});
  });

  it('when clearing, should remove the file and tolerate a missing one', async () => {
    await store.save('j1', { summary: 's' });
    await store.clear('j1');
    await store.clear('j1');

    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe('MemoryJobArtifactStore', () => {
  it('when saving and clearing, should behave like the file store', async () => {
    const store = new MemoryJobArtifactStore();

    await store.save('j1', { transcript: 't' });
    await expect(store.load('j1')).resolves.toEqual({ transcript: 't' });

    await store.clear('j1');
    await expect(store.load('j1')).resolves.toEqual({});
  });
});
