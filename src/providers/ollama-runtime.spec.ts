import { EventEmitter } from 'node:events';
import * as path from 'node:path';

import {
  LOCAL_ASSISTANT_PORT,
  OllamaRuntime,
  OllamaRuntimeMessages,
  type OllamaRuntimeDeps,
  type RuntimeChild,
  type SpawnProcess,
} from './ollama-runtime';

class FakeChild extends EventEmitter implements RuntimeChild {
  readonly kill = jest.fn(() => true);

  constructor(readonly pid: number | undefined = 4321) {
    super();
  }
}

interface SetupOptions {
  installed?: boolean;
  /** Quantas conferências falham antes de o assistente responder (`Infinity` = nunca). */
  failuresBeforeUp?: number;
  platform?: NodeJS.Platform;
  killTree?: OllamaRuntimeDeps['killTree'];
  port?: number;
  readyTimeoutMs?: number;
}

type SpawnArgs = Parameters<SpawnProcess>;

function setup(options: SetupOptions = {}) {
  const children: FakeChild[] = [];
  let pings = 0;
  let failures = options.failuresBeforeUp ?? 0;

  const spawnProcess = jest.fn((...args: SpawnArgs) => {
    void args;

    const child = new FakeChild();

    children.push(child);

    return child;
  });
  const ping = jest.fn(() => Promise.resolve({ ok: pings++ >= failures }));
  const runtime = new OllamaRuntime({
    programDir: path.join('C:', 'dados', 'ollama'),
    modelsDir: path.join('C:', 'dados', 'modelos'),
    platform: options.platform ?? 'win32',
    spawnProcess,
    ping,
    killTree: options.killTree,
    port: options.port,
    readyTimeoutMs: options.readyTimeoutMs ?? 50,
    pollMs: 5,
    // cede ao laço de eventos, como a espera de verdade (senão o laço acaba antes de o teste agir)
    wait: () => new Promise<void>((resolve) => setImmediate(resolve)),
    exists: () => options.installed ?? true,
  });

  return {
    runtime,
    children,
    spawnProcess,
    ping,
    /** Faz o assistente "cair": as próximas conferências falham `count` vezes antes de ele voltar. */
    goDown: (count: number) => {
      pings = 0;
      failures = count;
    },
  };
}

const nextTick = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('OllamaRuntime', () => {
  describe('endereço e programa', () => {
    it('when no port is given, should serve on a private port different from the default one', () => {
      const { runtime } = setup();

      expect(runtime.baseUrl).toBe(`http://127.0.0.1:${LOCAL_ASSISTANT_PORT}`);
      expect(LOCAL_ASSISTANT_PORT).not.toBe(11434);
    });

    it('when a port is given, should use it', () => {
      expect(setup({ port: 9999 }).runtime.baseUrl).toBe('http://127.0.0.1:9999');
    });

    it.each([
      ['win32', 'ollama.exe'],
      ['linux', 'ollama'],
    ] as const)('when on %s, should run %s from the program folder', (platform, file) => {
      expect(setup({ platform }).runtime.executable()).toBe(
        path.join('C:', 'dados', 'ollama', file),
      );
    });

    it('when the program file exists, should be installed; otherwise not', () => {
      expect(setup({ installed: true }).runtime.isInstalled()).toBe(true);
      expect(setup({ installed: false }).runtime.isInstalled()).toBe(false);
    });
  });

  describe('ensureRunning', () => {
    it('when the program is not installed, should refuse with a clear message and start nothing', async () => {
      const { runtime, spawnProcess } = setup({ installed: false });

      await expect(runtime.ensureRunning()).rejects.toThrow(OllamaRuntimeMessages.notInstalled);
      expect(spawnProcess).not.toHaveBeenCalled();
    });

    it('when it already answers, should not start another one', async () => {
      const { runtime, spawnProcess } = setup();

      await runtime.ensureRunning();

      expect(spawnProcess).not.toHaveBeenCalled();
    });

    it('when it is off, should start it on the private port with the models in the user data', async () => {
      const { runtime, spawnProcess } = setup({ failuresBeforeUp: 3 });

      await runtime.ensureRunning();

      expect(spawnProcess).toHaveBeenCalledTimes(1);

      const [command, args, spawnOptions] = spawnProcess.mock.calls[0];

      expect(command).toBe(path.join('C:', 'dados', 'ollama', 'ollama.exe'));
      expect(args).toEqual(['serve']);
      expect(spawnOptions).toMatchObject({ windowsHide: true, stdio: 'ignore' });
      expect(spawnOptions.env.OLLAMA_HOST).toBe(`127.0.0.1:${LOCAL_ASSISTANT_PORT}`);
      expect(spawnOptions.env.OLLAMA_MODELS).toBe(path.join('C:', 'dados', 'modelos'));
    });

    it('when several callers ask at once, should start it only one time', async () => {
      const { runtime, spawnProcess } = setup({ failuresBeforeUp: 3 });

      await Promise.all([
        runtime.ensureRunning(),
        runtime.ensureRunning(),
        runtime.ensureRunning(),
      ]);

      expect(spawnProcess).toHaveBeenCalledTimes(1);
    });

    it('when it is already up from a previous call, should not start it again', async () => {
      const { runtime, spawnProcess } = setup({ failuresBeforeUp: 2 });

      await runtime.ensureRunning();
      await runtime.ensureRunning();

      expect(spawnProcess).toHaveBeenCalledTimes(1);
    });

    it('when the process stops before answering, should fail saying it could not start', async () => {
      const { runtime, children } = setup({ failuresBeforeUp: Infinity, readyTimeoutMs: 5_000 });
      const pending = runtime.ensureRunning();

      await nextTick();
      children[0].emit('exit');

      await expect(pending).rejects.toThrow(OllamaRuntimeMessages.failedToStart);
    });

    it('when it never answers, should give up with a message about the delay', async () => {
      const { runtime } = setup({ failuresBeforeUp: Infinity, readyTimeoutMs: 20 });

      await expect(runtime.ensureRunning()).rejects.toThrow(OllamaRuntimeMessages.tooSlow);
    });

    it('when the process died after running, should start a new one on the next call', async () => {
      const { runtime, children, spawnProcess, goDown } = setup({ failuresBeforeUp: 2 });

      await runtime.ensureRunning();
      goDown(2);
      children[0].emit('exit');
      await runtime.ensureRunning();

      expect(spawnProcess).toHaveBeenCalledTimes(2);
    });
  });

  describe('stop', () => {
    it('when it was started by the app, should kill the whole process tree when a way exists', async () => {
      const killTree = jest.fn();
      const { runtime, children } = setup({ failuresBeforeUp: 1, killTree });

      await runtime.ensureRunning();
      runtime.stop();

      expect(killTree).toHaveBeenCalledWith(4321);
      expect(children[0].kill).not.toHaveBeenCalled();
    });

    it('when there is no way to kill the tree, should kill the process itself', async () => {
      const { runtime, children } = setup({ failuresBeforeUp: 1 });

      await runtime.ensureRunning();
      runtime.stop();

      expect(children[0].kill).toHaveBeenCalledTimes(1);
    });

    it('when nothing was started by the app, should do nothing', () => {
      const killTree = jest.fn();

      setup({ killTree }).runtime.stop();

      expect(killTree).not.toHaveBeenCalled();
    });

    it('when stopped twice, should kill only once', async () => {
      const killTree = jest.fn();
      const { runtime } = setup({ failuresBeforeUp: 1, killTree });

      await runtime.ensureRunning();
      runtime.stop();
      runtime.stop();

      expect(killTree).toHaveBeenCalledTimes(1);
    });
  });
});
