import {
  COMPONENT_TEMPLATES,
  catalogFor,
  findComponent,
  modelSpecs,
  platformTarget,
} from './component-manifest';

const WINDOWS = 'win32-x64';
const LINUX = 'linux-x64';

describe('COMPONENT_TEMPLATES', () => {
  it('when listing the components, should have unique ids', () => {
    const ids = COMPONENT_TEMPLATES.map((spec) => spec.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([WINDOWS, LINUX])(
    'when a component is downloadable on %s, should have an https url and a sha256',
    (target) => {
      for (const spec of catalogFor(target).filter((item) => item.kind !== 'bundled')) {
        expect(spec.download?.url).toMatch(/^https:\/\//);
        expect(spec.download?.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(spec.sizeBytes).toBeGreaterThan(0);
      }
    },
  );

  it.each([WINDOWS, LINUX])(
    'when a component is bundled on %s, should be required and have nothing to download',
    (target) => {
      for (const spec of catalogFor(target).filter((item) => item.kind === 'bundled')) {
        expect(spec.required).toBe(true);
        expect(spec.download).toBeUndefined();
      }
    },
  );

  it('when naming the components, should use generic names without tool or system terms', () => {
    for (const template of COMPONENT_TEMPLATES) {
      expect(template.label).not.toMatch(/ffmpeg|yt-dlp|whisper|cuda|nvidia|\.exe|win/i);
    }
  });
});

describe('catalogFor', () => {
  it('when asking for Windows, should keep the CUDA pack as a zip of DLLs', () => {
    expect(findComponent('cuda-pack', WINDOWS)?.kind).toBe('zip');
  });

  it('when asking for Linux, should not offer the CUDA pack', () => {
    expect(findComponent('cuda-pack', LINUX)).toBeUndefined();
  });

  it('when asking for a system with no variant, should keep only what is not system specific', () => {
    const ids = catalogFor('darwin-arm64').map((spec) => spec.id);

    expect(ids).not.toContain('ffmpeg');
    expect(ids).toContain('model-small');
  });

  it('when asking for ffmpeg, should be bundled on Windows and downloaded on Linux', () => {
    expect(findComponent('ffmpeg', WINDOWS)?.kind).toBe('bundled');
    expect(findComponent('ffmpeg', LINUX)?.kind).toBe('binary');
  });

  it('when looking up an unknown id, should return undefined', () => {
    expect(findComponent('nao-existe', WINDOWS)).toBeUndefined();
  });

  it('when looking up yt-dlp, should be an optional single program from the official releases', () => {
    for (const target of [WINDOWS, LINUX]) {
      const spec = findComponent('yt-dlp', target);

      expect(spec?.kind).toBe('binary');
      expect(spec?.required).toBe(false);
      expect(spec?.download?.url).toMatch(
        /^https:\/\/github\.com\/yt-dlp\/yt-dlp\/releases\/download\//,
      );
    }
  });

  it('when listing models, should only return the model group', () => {
    expect(modelSpecs(LINUX).every((spec) => spec.group === 'model')).toBe(true);
    expect(modelSpecs(LINUX).length).toBeGreaterThan(1);
  });

  it('when building the target key, should join system and architecture', () => {
    expect(platformTarget('linux', 'x64')).toBe(LINUX);
  });
});
