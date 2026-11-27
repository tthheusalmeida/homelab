import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { ComponentSpec } from './component-manifest';
import {
  OllamaModelInstaller,
  OllamaModelMessages,
  manifestPath,
  type PullFetch,
} from './ollama-model-installer';

const spec = (overrides: Partial<ComponentSpec> = {}): ComponentSpec => ({
  id: 'llm-balanced',
  group: 'llm',
  label: 'Assistente equilibrado',
  description: '',
  required: false,
  kind: 'ollama-model',
  sizeBytes: 1_000,
  file: 'qwen3.5:4b',
  ...overrides,
});

const encoder = new TextEncoder();

/** Resposta em fluxo com os pedaços dados (um pedaço pode cortar uma linha no meio). */
const streamOf = (...chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
  );

const line = (value: object) => `${JSON.stringify(value)}\n`;

describe('manifestPath', () => {
  const root = path.join('C:', 'modelos');

  it('when the model is from the official library, should point at its manifest by name and size', () => {
    expect(manifestPath(root, 'qwen3.5:4b')).toBe(
      path.join(root, 'manifests', 'registry.ollama.ai', 'library', 'qwen3.5', '4b'),
    );
  });

  it('when the reference has no tag, should use latest', () => {
    expect(manifestPath(root, 'llama3')).toBe(
      path.join(root, 'manifests', 'registry.ollama.ai', 'library', 'llama3', 'latest'),
    );
  });

  it('when the model belongs to a namespace, should keep it instead of "library"', () => {
    expect(manifestPath(root, 'alguem/modelo:7b')).toBe(
      path.join(root, 'manifests', 'registry.ollama.ai', 'alguem', 'modelo', '7b'),
    );
  });
});

describe('OllamaModelInstaller', () => {
  let dir: string;
  let ensureRunning: jest.Mock;
  let fetchFn: jest.Mock;
  let progress: jest.Mock;
  let clock: number;

  const build = () =>
    new OllamaModelInstaller({
      modelsDir: dir,
      assistant: { baseUrl: 'http://127.0.0.1:11435', isInstalled: () => true, ensureRunning },
      fetchFn: fetchFn as unknown as PullFetch,
      now: () => (clock += 1_000),
    });

  const context = () => ({ signal: new AbortController().signal, progress });

  const writeManifest = (ref = 'qwen3.5:4b') => {
    const file = manifestPath(dir, ref);

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{}');
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ollama-installer-'));
    ensureRunning = jest.fn().mockResolvedValue(undefined);
    fetchFn = jest.fn();
    progress = jest.fn();
    clock = 0;
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  describe('handles e isInstalled', () => {
    it('when the component is an assistant model, should handle it; other kinds, not', () => {
      expect(build().handles(spec())).toBe(true);
      expect(build().handles(spec({ kind: 'file' }))).toBe(false);
      expect(build().handles(spec({ kind: 'zip' }))).toBe(false);
    });

    it('when the manifest exists, should be installed without starting anything', () => {
      writeManifest();

      expect(build().isInstalled(spec())).toBe(true);
      expect(ensureRunning).not.toHaveBeenCalled();
    });

    it('when the manifest does not exist, should not be installed', () => {
      expect(build().isInstalled(spec())).toBe(false);
    });
  });

  describe('install', () => {
    it('when installing, should start the assistant and ask it to pull the model as a stream', async () => {
      fetchFn.mockImplementation(async () => {
        writeManifest();

        return streamOf(line({ status: 'success' }));
      });

      await build().install(spec(), context());

      expect(ensureRunning).toHaveBeenCalledTimes(1);
      expect(fetchFn).toHaveBeenCalledWith(
        'http://127.0.0.1:11435/api/pull',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ model: 'qwen3.5:4b', stream: true }),
        }),
      );
    });

    it('when the parts download, should add every part together and report against the catalog size', async () => {
      fetchFn.mockImplementation(async () => {
        writeManifest();

        return streamOf(
          line({ status: 'pulling manifest' }),
          line({ status: 'pulling a', digest: 'sha256:a', total: 800, completed: 200 }),
          line({ status: 'pulling b', digest: 'sha256:b', total: 200, completed: 100 }),
          line({ status: 'pulling a', digest: 'sha256:a', total: 800, completed: 600 }),
          line({ status: 'success' }),
        );
      });

      await build().install(spec(), context());

      const reported = progress.mock.calls.map(([received]) => received as number);

      expect(reported).toContain(300);
      expect(reported).toContain(700);
      expect(progress.mock.calls.every(([, total]) => total === 1_000)).toBe(true);
      expect(progress).toHaveBeenLastCalledWith(1_000, 1_000);
    });

    it('when the parts add up to more than the catalog size, should never report beyond it', async () => {
      fetchFn.mockImplementation(async () => {
        writeManifest();

        return streamOf(
          line({ digest: 'sha256:a', total: 5_000, completed: 4_000 }),
          line({ status: 'success' }),
        );
      });

      await build().install(spec(), context());

      expect(Math.max(...progress.mock.calls.map(([received]) => received as number))).toBe(1_000);
    });

    it('when a line is cut between two chunks, should still read it whole', async () => {
      const text = line({ digest: 'sha256:a', total: 1_000, completed: 400 });

      fetchFn.mockImplementation(async () => {
        writeManifest();

        return streamOf(text.slice(0, 15), text.slice(15), line({ status: 'success' }));
      });

      await build().install(spec(), context());

      expect(progress.mock.calls.map(([received]) => received)).toContain(400);
    });

    it('when many lines come quickly, should not report progress more often than the interval', async () => {
      const slowClock = build();
      const lines = Array.from({ length: 20 }, (_, index) =>
        line({ digest: 'sha256:a', total: 1_000, completed: index * 10 }),
      );

      let now = 0;
      const installer = new OllamaModelInstaller({
        modelsDir: dir,
        assistant: { baseUrl: 'http://x', isInstalled: () => true, ensureRunning },
        fetchFn: (async () => {
          writeManifest();

          return streamOf(...lines, line({ status: 'success' }));
        }) as unknown as PullFetch,
        now: () => (now += 10),
      });

      void slowClock;
      await installer.install(spec(), context());

      expect(progress.mock.calls.length).toBeLessThan(lines.length);
    });

    it('when the assistant answers with an error line, should fail with a friendly message', async () => {
      fetchFn.mockResolvedValue(
        streamOf(line({ error: 'pull model manifest: file does not exist' })),
      );

      await expect(build().install(spec(), context())).rejects.toThrow(
        OllamaModelMessages.pullFailed,
      );
    });

    it('when the answer is not ok, should fail with a friendly message', async () => {
      fetchFn.mockResolvedValue(new Response('erro', { status: 500 }));

      await expect(build().install(spec(), context())).rejects.toThrow(
        OllamaModelMessages.pullFailed,
      );
    });

    it('when the stream ends without success, should fail instead of pretending it installed', async () => {
      fetchFn.mockResolvedValue(streamOf(line({ status: 'pulling manifest' })));

      await expect(build().install(spec(), context())).rejects.toThrow(
        OllamaModelMessages.pullFailed,
      );
    });

    it('when success comes but the manifest is missing, should fail', async () => {
      fetchFn.mockResolvedValue(streamOf(line({ status: 'success' })));

      await expect(build().install(spec(), context())).rejects.toThrow(
        OllamaModelMessages.pullFailed,
      );
    });

    it('when the assistant cannot start, should pass its message on and download nothing', async () => {
      ensureRunning.mockRejectedValue(new Error('não iniciou'));

      await expect(build().install(spec(), context())).rejects.toThrow('não iniciou');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('when the user cancels, should hand the abort signal to the request so the download stops', async () => {
      const controller = new AbortController();

      fetchFn.mockImplementation(async (_url: string, init: { signal: AbortSignal }) => {
        expect(init.signal).toBe(controller.signal);
        throw new DOMException('aborted', 'AbortError');
      });

      await expect(
        build().install(spec(), { signal: controller.signal, progress }),
      ).rejects.toThrow('aborted');
    });

    it('when the stream contains blank or broken lines, should ignore them', async () => {
      fetchFn.mockImplementation(async () => {
        writeManifest();

        return streamOf('\n', 'isto não é json\n', line({ status: 'success' }));
      });

      await expect(build().install(spec(), context())).resolves.toBeUndefined();
    });
  });

  describe('remove', () => {
    it('when removing, should ask the assistant to delete the model', async () => {
      fetchFn.mockResolvedValue(new Response(null, { status: 200 }));

      await build().remove(spec());

      expect(ensureRunning).toHaveBeenCalledTimes(1);
      expect(fetchFn).toHaveBeenCalledWith(
        'http://127.0.0.1:11435/api/delete',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ model: 'qwen3.5:4b' }),
        }),
      );
    });

    it('when the assistant says the model is already gone, should count as removed', async () => {
      fetchFn.mockResolvedValue(new Response(null, { status: 404 }));

      await expect(build().remove(spec())).resolves.toBeUndefined();
    });

    it('when the assistant fails to delete, should say so', async () => {
      fetchFn.mockResolvedValue(new Response(null, { status: 500 }));

      await expect(build().remove(spec())).rejects.toThrow(OllamaModelMessages.removeFailed);
    });
  });
});

describe('OllamaModelInstaller no Ollama do usuário', () => {
  it('when it handles the pull kind only, should leave the assistant models to the other installer', () => {
    const installer = new OllamaModelInstaller({
      kind: 'ollama-pull',
      assistant: {
        baseUrl: 'http://localhost:11434',
        isInstalled: () => true,
        ensureRunning: jest.fn(),
      },
      presence: { has: () => false },
      fetchFn: jest.fn(),
    });

    expect(installer.handles(spec({ kind: 'ollama-pull' }))).toBe(true);
    expect(installer.handles(spec({ kind: 'ollama-model' }))).toBe(false);
  });

  it('when the pull finishes, should refresh what the server has and only then check the model is there', async () => {
    const present = new Set<string>();
    const refresh = jest.fn(async () => {
      present.add('qwen3.5:4b');
    });
    const fetchFn: PullFetch = jest.fn(async () =>
      streamOf(
        line({ status: 'pulling x', digest: 'd1', total: 10, completed: 10 }),
        line({ status: 'success' }),
      ),
    );
    const installer = new OllamaModelInstaller({
      kind: 'ollama-pull',
      assistant: {
        baseUrl: 'http://localhost:11434',
        isInstalled: () => true,
        ensureRunning: jest.fn(),
      },
      presence: { has: (ref) => present.has(ref), refresh },
      fetchFn,
    });

    await installer.install(spec({ kind: 'ollama-pull' }), {
      signal: new AbortController().signal,
      progress: jest.fn(),
    });

    expect(refresh).toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledWith('http://localhost:11434/api/pull', expect.anything());
  });

  it('when the own Ollama is off, should fail with its message and not try to download', async () => {
    const fetchFn: PullFetch = jest.fn();
    const installer = new OllamaModelInstaller({
      kind: 'ollama-pull',
      assistant: {
        baseUrl: 'http://localhost:11434',
        isInstalled: () => true,
        ensureRunning: jest.fn().mockRejectedValue(new Error('Ollama desligado')),
      },
      presence: { has: () => false },
      fetchFn,
    });

    await expect(
      installer.install(spec({ kind: 'ollama-pull' }), {
        signal: new AbortController().signal,
        progress: jest.fn(),
      }),
    ).rejects.toThrow('Ollama desligado');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
