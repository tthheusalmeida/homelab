import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { writeZip } from '../backup/zip';
import { FakeEventPublisher } from '../ipc/testing/fake-event-publisher';
import type { HardwareProfile } from '../shared/contracts/components';
import { JsonFile } from '../storage/json-file';

import type { ComponentInstaller, InstallContext } from './component-installer';
import type { ComponentSpec } from './component-manifest';
import { ComponentsService } from './components.service';
import type { FetchLike } from './downloader';

const hardware: HardwareProfile = {
  gpus: [],
  ramMb: 16384,
  recommendation: { accelerator: 'cpu', componentIds: [], modelId: '', message: 'ok' },
};

const assistantModel: ComponentSpec = {
  id: 'llm-balanced',
  group: 'llm',
  label: 'Assistente equilibrado',
  description: '',
  required: false,
  kind: 'ollama-model',
  sizeBytes: 1_000,
  file: 'qwen3.5:4b',
};

describe('ComponentsService com instaladores e pacotes em pasta própria', () => {
  let dir: string;
  let binDir: string;
  let packagesDir: string;
  let events: FakeEventPublisher;
  let installed: Set<string>;
  let installer: jest.Mocked<ComponentInstaller>;

  const build = (catalog: ComponentSpec[], fetchFn: FetchLike = jest.fn()) =>
    new ComponentsService({
      binDir,
      modelsDir: path.join(dir, 'models'),
      downloadsDir: path.join(dir, 'downloads'),
      packagesDir,
      platform: 'win32',
      state: new JsonFile(path.join(dir, 'components.json')),
      events,
      fetchFn,
      hardware: () => Promise.resolve(hardware),
      catalog,
      installers: [installer],
    });

  const infoOf = async (service: ComponentsService, id: string) =>
    (await service.status()).components.find((component) => component.id === id);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'components-installers-'));
    binDir = path.join(dir, 'bin');
    packagesDir = path.join(dir, 'packages');
    fs.mkdirSync(binDir, { recursive: true });
    events = new FakeEventPublisher();
    installed = new Set();
    installer = {
      handles: jest.fn((spec: ComponentSpec) => spec.kind === 'ollama-model'),
      isInstalled: jest.fn((spec: ComponentSpec) => installed.has(spec.id)),
      install: jest.fn(async (spec: ComponentSpec, _context: InstallContext) => {
        void _context;
        installed.add(spec.id);
      }),
      remove: jest.fn(async (spec: ComponentSpec) => {
        installed.delete(spec.id);
      }),
    };
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  describe('instalador próprio', () => {
    it('when the installer says it is not there, should list the assistant as missing', async () => {
      expect((await infoOf(build([assistantModel]), 'llm-balanced'))?.state).toBe('missing');
    });

    it('when the installer says it is there, should list it as installed', async () => {
      installed.add('llm-balanced');

      expect((await infoOf(build([assistantModel]), 'llm-balanced'))?.state).toBe('installed');
    });

    it('when installing, should hand the work to the installer and not download a file', async () => {
      const fetchFn = jest.fn();
      const service = build([assistantModel], fetchFn as unknown as FetchLike);

      await service.install(['llm-balanced']);
      await service.whenIdle();

      expect(installer.install).toHaveBeenCalledTimes(1);
      expect(fetchFn).not.toHaveBeenCalled();
      expect((await infoOf(service, 'llm-balanced'))?.state).toBe('installed');
    });

    it('when the installer reports progress, should publish it against the catalog size', async () => {
      installer.install.mockImplementation(async (spec, context) => {
        context.progress(400, 0);
        installed.add(spec.id);
      });

      const service = build([assistantModel]);

      await service.install(['llm-balanced']);
      await service.whenIdle();

      const downloading = events.published
        .map(({ payload }) => payload as { components: Array<{ id: string; progress: unknown }> })
        .flatMap(({ components }) => components)
        .filter((component) => component.id === 'llm-balanced' && component.progress);

      expect(downloading).toContainEqual(
        expect.objectContaining({ progress: { receivedBytes: 400, totalBytes: 1_000 } }),
      );
    });

    it('when the installer fails, should mark only that component as failed with the reason', async () => {
      installer.install.mockRejectedValue(new Error('Sem conexão.'));

      const service = build([assistantModel]);

      await service.install(['llm-balanced']);
      await service.whenIdle();

      expect(await infoOf(service, 'llm-balanced')).toMatchObject({
        state: 'failed',
        error: 'Sem conexão.',
      });
    });

    it('when the user cancels, should drop the entry instead of showing a failure', async () => {
      installer.install.mockImplementation(async (_spec, { signal }) => {
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')));
          service.cancel();
        });
      });

      const service = build([assistantModel]);

      await service.install(['llm-balanced']);
      await service.whenIdle();

      expect((await infoOf(service, 'llm-balanced'))?.state).toBe('missing');
    });

    it('when the assistant is already installed, should not install it again', async () => {
      installed.add('llm-balanced');

      const service = build([assistantModel]);

      await service.install(['llm-balanced']);
      await service.whenIdle();

      expect(installer.install).not.toHaveBeenCalled();
    });

    it('when removing, should ask the installer and leave the other files alone', async () => {
      installed.add('llm-balanced');

      const service = build([assistantModel]);
      const status = await service.remove('llm-balanced');

      expect(installer.remove).toHaveBeenCalledWith(assistantModel);
      expect(status.components.find((component) => component.id === 'llm-balanced')?.state).toBe(
        'missing',
      );
    });

    it('when the assistant model is installed, should not count as the transcription model', async () => {
      installed.add('llm-balanced');

      const status = await build([assistantModel]).status();

      expect(status.needsSetup).toBe(true);
    });
  });

  describe('pacote em pasta própria (o programa do assistente)', () => {
    const runtimeSpec = (zipBody: Buffer): ComponentSpec => ({
      id: 'ollama-runtime',
      group: 'assistant',
      label: 'Assistente local',
      description: '',
      required: false,
      kind: 'zip',
      sizeBytes: zipBody.length,
      file: 'ollama.exe',
      extractTo: 'ollama',
      provides: ['ollama.exe'],
      download: {
        url: 'https://x/ollama.zip',
        sha256: createHash('sha256').update(zipBody).digest('hex'),
      },
    });

    const zipBody = async () => {
      const file = path.join(dir, 'ollama.zip');

      await writeZip(file, [
        { name: 'ollama.exe', source: { buffer: Buffer.from('exe') } },
        { name: 'lib/ollama/ggml.dll', source: { buffer: Buffer.from('dll') } },
      ]);

      return fs.readFileSync(file);
    };

    const fetchOf = (body: Buffer) =>
      jest.fn(() =>
        Promise.resolve(
          new Response(new Uint8Array(body), {
            headers: { 'content-length': String(body.length) },
          }),
        ),
      ) as unknown as FetchLike;

    it('when installing, should extract into its own folder under the user data, not into the app bin folder', async () => {
      const body = await zipBody();
      const service = build([runtimeSpec(body)], fetchOf(body));

      await service.install(['ollama-runtime']);
      await service.whenIdle();

      expect(fs.existsSync(path.join(packagesDir, 'ollama', 'ollama.exe'))).toBe(true);
      expect(fs.existsSync(path.join(packagesDir, 'ollama', 'lib', 'ollama', 'ggml.dll'))).toBe(
        true,
      );
      expect(fs.readdirSync(binDir)).toEqual([]);
      expect((await infoOf(service, 'ollama-runtime'))?.state).toBe('installed');
    });

    it('when the program is not in its folder, should list it as missing even if the bin folder has a file with that name', async () => {
      fs.writeFileSync(path.join(binDir, 'ollama.exe'), 'outro');

      const body = await zipBody();

      expect((await infoOf(build([runtimeSpec(body)]), 'ollama-runtime'))?.state).toBe('missing');
    });

    it('when removing, should delete the whole folder with its libraries', async () => {
      const body = await zipBody();
      const service = build([runtimeSpec(body)], fetchOf(body));

      await service.install(['ollama-runtime']);
      await service.whenIdle();
      await service.remove('ollama-runtime');

      expect(fs.existsSync(path.join(packagesDir, 'ollama'))).toBe(false);
      expect((await infoOf(service, 'ollama-runtime'))?.state).toBe('missing');
    });

    it('when the app folder is replaced by an update, should keep the program, since it lives in the user data', async () => {
      const body = await zipBody();
      const service = build([runtimeSpec(body)], fetchOf(body));

      await service.install(['ollama-runtime']);
      await service.whenIdle();
      fs.rmSync(binDir, { recursive: true, force: true });
      fs.mkdirSync(binDir, { recursive: true });

      expect((await infoOf(service, 'ollama-runtime'))?.state).toBe('installed');
    });
  });
});
