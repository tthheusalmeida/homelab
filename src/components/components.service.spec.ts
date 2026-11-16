import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { writeZip } from '../backup/zip';
import { FakeEventPublisher } from '../ipc/testing/fake-event-publisher';
import type { HardwareProfile } from '../shared/contracts/components';
import { IpcErrorCode } from '../shared/errors';
import { IpcEvents } from '../shared/events';
import { JsonFile } from '../storage/json-file';

import type { ComponentSpec } from './component-manifest';
import { ComponentMessages, ComponentsService } from './components.service';
import type { FetchLike } from './downloader';

const sha = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

const MODEL_A = Buffer.from('modelo A '.repeat(100));
const MODEL_B = Buffer.from('modelo B '.repeat(100));

const hardware: HardwareProfile = {
  gpus: [],
  ramMb: 16384,
  recommendation: {
    accelerator: 'cpu',
    componentIds: ['model-a'],
    modelId: 'model-a',
    message: 'ok',
  },
};

const modelSpec = (id: string, file: string, body: Buffer): ComponentSpec => ({
  id,
  group: 'model',
  label: id,
  description: '',
  required: false,
  kind: 'file',
  sizeBytes: body.length,
  file,
  download: { url: `https://x/${file}`, sha256: sha(body) },
});

describe('ComponentsService', () => {
  let dir: string;
  let binDir: string;
  let events: FakeEventPublisher;
  let bodies: Map<string, Buffer>;
  let fetchFn: jest.Mock;
  let catalog: ComponentSpec[];

  const build = () =>
    new ComponentsService({
      binDir,
      modelsDir: path.join(dir, 'models'),
      downloadsDir: path.join(dir, 'downloads'),
      platform: 'win32',
      state: new JsonFile(path.join(dir, 'components.json')),
      events,
      fetchFn: fetchFn as unknown as FetchLike,
      hardware: () => Promise.resolve(hardware),
      catalog,
    });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'components-spec-'));
    binDir = path.join(dir, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, 'whisper-cli.exe'), 'x');
    events = new FakeEventPublisher();
    bodies = new Map([
      ['https://x/a.bin', MODEL_A],
      ['https://x/b.bin', MODEL_B],
    ]);
    fetchFn = jest.fn((url: string) => {
      const body = bodies.get(url);

      return Promise.resolve(
        body
          ? new Response(new Uint8Array(body), {
              headers: { 'content-length': String(body.length) },
            })
          : new Response(null, { status: 404 }),
      );
    });
    catalog = [
      {
        id: 'runtime',
        group: 'runtime',
        label: 'Runtime',
        description: '',
        required: true,
        kind: 'bundled',
        sizeBytes: 0,
        file: 'whisper-cli',
      },
      modelSpec('model-a', 'a.bin', MODEL_A),
      modelSpec('model-b', 'b.bin', MODEL_B),
    ];
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const infoOf = async (service: ComponentsService, id: string) =>
    (await service.status()).components.find((component) => component.id === id);

  it('when nothing was downloaded, should list the bundled runtime installed, the models missing and ask for setup', async () => {
    const status = await build().status();

    expect(status.components.map((c) => [c.id, c.state])).toEqual([
      ['runtime', 'installed'],
      ['model-a', 'missing'],
      ['model-b', 'missing'],
    ]);
    expect(status.needsSetup).toBe(true);
    expect(status.running).toBe(false);
    expect(status.overall).toBeNull();
  });

  it('when a required bundled file is missing, should flag it as missing', async () => {
    fs.rmSync(path.join(binDir, 'whisper-cli.exe'));

    expect((await infoOf(build(), 'runtime'))?.state).toBe('missing');
  });

  it('when the hardware recommends a component, should mark it recommended', async () => {
    expect((await infoOf(build(), 'model-a'))?.recommended).toBe(true);
    expect((await infoOf(build(), 'model-b'))?.recommended).toBe(false);
  });

  it('when installing a model, should download it, install it and make it the active one', async () => {
    const service = build();

    await service.install(['model-a']);
    await service.whenIdle();

    const status = await service.status();

    expect(fs.readFileSync(path.join(dir, 'models', 'a.bin')).equals(MODEL_A)).toBe(true);
    expect(status.components.find((c) => c.id === 'model-a')).toMatchObject({
      state: 'installed',
      active: true,
    });
    expect(status.needsSetup).toBe(false);
    expect(service.activeModelRef('padrao.bin')).toBe(path.join(dir, 'models', 'a.bin'));
  });

  it('when installing, should publish progress events ending with the model installed', async () => {
    const service = build();

    await service.install(['model-a']);
    await service.whenIdle();

    const published = (events as FakeEventPublisher).payloadsOf(IpcEvents.componentsProgress);
    const states = published.map(
      (status) => status.components.find((c) => c.id === 'model-a')?.state,
    );

    expect(states).toContain('queued');
    expect(states).toContain('downloading');
    expect(states.at(-1)).toBe('installed');
    expect(published.some((status) => status.overall?.total === 1)).toBe(true);
  });

  it('when the checksum fails, should mark the component failed with the reason and keep going', async () => {
    bodies.set('https://x/a.bin', Buffer.from('corrompido'));
    const service = build();

    await service.install(['model-a', 'model-b']);
    await service.whenIdle();

    expect(await infoOf(service, 'model-a')).toMatchObject({ state: 'failed' });
    expect((await infoOf(service, 'model-a'))?.error).toContain('corrompido');
    expect(await infoOf(service, 'model-b')).toMatchObject({ state: 'installed' });
    expect(fs.existsSync(path.join(dir, 'models', 'a.bin'))).toBe(false);
  });

  it('when the id is unknown, should reject with VALIDATION', async () => {
    await expect(build().install(['nao-existe'])).rejects.toMatchObject({
      code: IpcErrorCode.VALIDATION,
      message: ComponentMessages.unknown('nao-existe'),
    });
  });

  it('when nothing is selected, should reject with VALIDATION', async () => {
    await expect(build().install([])).rejects.toMatchObject({ code: IpcErrorCode.VALIDATION });
  });

  it('when asked to install a bundled component, should reject with VALIDATION', async () => {
    await expect(build().install(['runtime'])).rejects.toMatchObject({
      code: IpcErrorCode.VALIDATION,
    });
  });

  it('when an installation is already running, should reject a second one', async () => {
    const service = build();

    await service.install(['model-a']);

    await expect(service.install(['model-b'])).rejects.toMatchObject({
      message: ComponentMessages.busy,
    });
    await service.whenIdle();
  });

  it('when the component is already installed, should not download again', async () => {
    const service = build();

    await service.install(['model-a']);
    await service.whenIdle();
    fetchFn.mockClear();
    await service.install(['model-a']);
    await service.whenIdle();

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('when cancelling, should stop, keep no partial file and return the item to missing', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    fetchFn.mockImplementation(async (_url: string, init: { signal: AbortSignal }) => {
      await gate;

      if (init.signal.aborted) {
        throw new DOMException('aborted', 'AbortError');
      }

      return new Response(new Uint8Array(MODEL_A));
    });
    const service = build();

    await service.install(['model-a', 'model-b']);
    service.cancel();
    release();
    await service.whenIdle();

    expect(await infoOf(service, 'model-a')).toMatchObject({ state: 'missing', error: null });
    expect(await infoOf(service, 'model-b')).toMatchObject({ state: 'missing' });
    expect(fs.readdirSync(path.join(dir, 'models'))).toEqual([]);
  });

  it('when a model is installed, should allow switching the active model', async () => {
    const service = build();

    await service.install(['model-a', 'model-b']);
    await service.whenIdle();
    await service.setActiveModel('model-b');

    expect((await infoOf(service, 'model-b'))?.active).toBe(true);
    expect((await infoOf(service, 'model-a'))?.active).toBe(false);
  });

  it('when choosing a model that is not installed, should reject with NOT_FOUND', async () => {
    await expect(build().setActiveModel('model-b')).rejects.toMatchObject({
      code: IpcErrorCode.NOT_FOUND,
    });
  });

  it('when removing the active model, should reject; when removing another, should delete the file', async () => {
    const service = build();

    await service.install(['model-a', 'model-b']);
    await service.whenIdle();

    await expect(service.remove('model-a')).rejects.toMatchObject({
      message: ComponentMessages.activeModel,
    });

    await service.remove('model-b');

    expect(fs.existsSync(path.join(dir, 'models', 'b.bin'))).toBe(false);
    expect((await infoOf(service, 'model-b'))?.state).toBe('missing');
  });

  it('when removing a required component, should reject with VALIDATION', async () => {
    await expect(build().remove('runtime')).rejects.toMatchObject({
      code: IpcErrorCode.VALIDATION,
    });
  });

  it('when removing a component that is not installed, should reject with NOT_FOUND', async () => {
    await expect(build().remove('model-b')).rejects.toMatchObject({
      code: IpcErrorCode.NOT_FOUND,
    });
  });

  it('when a model only exists in the bin folder (development), should count as installed', async () => {
    fs.writeFileSync(path.join(binDir, 'b.bin'), MODEL_B);
    const service = build();

    expect((await infoOf(service, 'model-b'))?.state).toBe('installed');
    expect(service.activeModelRef('padrao.bin')).toBe(path.join(binDir, 'b.bin'));
  });

  it('when no model is installed, should fall back to the default file name', () => {
    expect(build().activeModelRef('padrao.bin')).toBe('padrao.bin');
  });

  it('when installing a zip pack, should extract it into the bin folder and delete the zip', async () => {
    const zipFile = path.join(dir, 'pack.zip');

    await writeZip(zipFile, [
      { name: 'ggml-cuda.dll', source: { buffer: Buffer.from('cuda') } },
      { name: 'cudart64_12.dll', source: { buffer: Buffer.from('rt') } },
    ]);
    const zipBody = fs.readFileSync(zipFile);

    bodies.set('https://x/pack.zip', zipBody);
    catalog.push({
      id: 'cuda-pack',
      group: 'gpu',
      label: 'CUDA',
      description: '',
      required: false,
      kind: 'zip',
      sizeBytes: zipBody.length,
      file: 'ggml-cuda.dll',
      download: { url: 'https://x/pack.zip', sha256: sha(zipBody) },
      provides: ['ggml-cuda.dll', 'cudart64_12.dll'],
    });
    const service = build();

    await service.install(['cuda-pack']);
    await service.whenIdle();

    expect((await infoOf(service, 'cuda-pack'))?.state).toBe('installed');
    expect(fs.existsSync(path.join(binDir, 'ggml-cuda.dll'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'downloads', 'cuda-pack.zip'))).toBe(false);

    await service.remove('cuda-pack');

    expect(fs.existsSync(path.join(binDir, 'ggml-cuda.dll'))).toBe(false);
    expect(fs.existsSync(path.join(binDir, 'cudart64_12.dll'))).toBe(false);
  });
});
