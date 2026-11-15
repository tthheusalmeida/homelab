import type { BackRuntime } from './back-runtime';
import type { MetadataAccess } from './module-patch';
import {
  patchWhisperProvider,
  WHISPER_SERVICE_MODULES,
  WHISPER_SERVICE_SOURCE,
} from './whisper-provider';

class WhisperService {}
class Other {}
class AIModule {}

function setup(providers: unknown[] | undefined = [Other, WhisperService]) {
  const state = { stored: providers as unknown };
  const metadata: MetadataAccess = {
    get: () => state.stored,
    set: (_key, value) => {
      state.stored = value;
    },
  };
  const moduleFn = jest.fn((file: string) => {
    if (file === WHISPER_SERVICE_SOURCE[0]) {
      return { WhisperService };
    }

    return { AIModule };
  });
  const runtime = { module: moduleFn } as unknown as Pick<BackRuntime, 'module'>;

  return { state, metadata, runtime, moduleFn };
}

describe('patchWhisperProvider', () => {
  it('when the module declares the WhisperService, should swap it for the desktop one keeping the token', () => {
    const { state, metadata, runtime } = setup();
    const whisper = { transcribe: jest.fn() };

    patchWhisperProvider({ runtime, metadata, whisper });

    expect(state.stored).toEqual([Other, { provide: WhisperService, useValue: whisper }]);
  });

  it('when patching, should load the service class and every module from the back', () => {
    const { metadata, runtime, moduleFn } = setup();

    patchWhisperProvider({ runtime, metadata, whisper: {} });

    expect(moduleFn).toHaveBeenCalledWith(WHISPER_SERVICE_SOURCE[0]);
    for (const [file] of WHISPER_SERVICE_MODULES) {
      expect(moduleFn).toHaveBeenCalledWith(file);
    }
  });

  it('when the module does not declare the WhisperService, should fail instead of silently keeping the back one', () => {
    const { metadata, runtime } = setup([Other]);

    expect(() => patchWhisperProvider({ runtime, metadata, whisper: {} })).toThrow(
      /não encontrado/,
    );
  });
});
