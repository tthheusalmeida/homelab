import { BackPlainSources, BackServices, BackServiceSources } from './back-services';

/** Cada arquivo do back vira uma classe falsa própria, para saber o que foi pedido a quem. */
function setup() {
  const classes = new Map<string, object>();
  const parseDocumentHints = jest.fn((raw: unknown) => ({ parsed: raw }));
  const jobTypeConfig = { 'video-to-transcript': { type: 'video-to-transcript', steps: [] } };
  const module = jest.fn((file: string) => {
    if (file === BackPlainSources.parseDocumentHints[0]) {
      return { parseDocumentHints };
    }

    if (file === BackPlainSources.jobTypeConfig[0]) {
      return { JobTypeConfig: jobTypeConfig };
    }

    const entry = Object.values(BackServiceSources)
      .flatMap((source) => [source.service, source.module])
      .find(([source]) => source === file);
    const name = entry?.[1] as string;
    const key = `${file}#${name}`;

    if (!classes.has(key)) {
      classes.set(key, class {});
    }

    return { [name]: classes.get(key) };
  });
  const instances = new Map<string, unknown>();
  const resolve = jest.fn((token: unknown, moduleClass: unknown) => {
    const key = `${[...classes].find(([, c]) => c === token)?.[0]}@${[...classes].find(([, c]) => c === moduleClass)?.[0]}`;

    return instances.get(key);
  });

  const keyFor = (source: { service: readonly string[]; module: readonly string[] }) =>
    `${source.service[0]}#${source.service[1]}@${source.module[0]}#${source.module[1]}`;

  return { module, resolve, instances, keyFor, parseDocumentHints, jobTypeConfig };
}

const build = (setupResult: ReturnType<typeof setup>) =>
  new BackServices({ module: setupResult.module } as never, setupResult.resolve);

describe('BackServices', () => {
  it('when building the readers, should load each service, its module and the hints parser from back/dist', () => {
    const s = setup();

    build(s).readers();

    const expected = [
      ...Object.values(BackServiceSources).flatMap((source) => [
        source.service[0],
        source.module[0],
      ]),
      BackPlainSources.parseDocumentHints[0],
    ];
    expect(new Set(s.module.mock.calls.map(([file]) => file))).toEqual(new Set(expected));
  });

  it('when building the readers, should resolve every service inside its own module', () => {
    const s = setup();

    build(s).readers();

    // `jobService` entra duas vezes: no catálogo e no lançador.
    expect(s.resolve).toHaveBeenCalledTimes(Object.keys(BackServiceSources).length + 1);
    for (const [token, moduleClass] of s.resolve.mock.calls) {
      expect(typeof token).toBe('function');
      expect(typeof moduleClass).toBe('function');
      expect(token).not.toBe(moduleClass);
    }
  });

  it('when the container answers, should expose each instance in the matching reader', () => {
    const s = setup();
    const usage = { getUsage: jest.fn() };
    const chat = { chat: jest.fn() };
    s.instances.set(s.keyFor(BackServiceSources.aiUsage), usage);
    s.instances.set(s.keyFor(BackServiceSources.chat), chat);

    const readers = build(s).readers();

    expect(readers.aiUsage).toBe(usage);
    expect(readers.chat).toBe(chat);
  });

  it('when usage and the ai catalog are resolved, should use the AIModule (the one the chat uses)', () => {
    expect(BackServiceSources.aiUsage.module).toEqual(['modules/ai/ai.module', 'AIModule']);
    expect(BackServiceSources.ai.module).toEqual(['modules/ai/ai.module', 'AIModule']);
  });

  it('when the container fails to resolve a service, should propagate the error', () => {
    const s = setup();
    const resolve = jest.fn(() => {
      throw new Error('não encontrado');
    });

    expect(() => new BackServices({ module: s.module } as never, resolve).readers()).toThrow(
      'não encontrado',
    );
  });
});

describe('BackServices: jobs', () => {
  it('when the jobs are built, should take the job service, the queue and both processors from the JobsModule', () => {
    for (const key of [
      'jobService',
      'jobRunner',
      'transcriptProcessor',
      'summaryProcessor',
    ] as const) {
      expect(BackServiceSources[key].module).toEqual(['modules/jobs/jobs.module', 'JobsModule']);
    }
  });

  it('when listing jobs, should read them from the JobService instance of the container', () => {
    const s = setup();
    const job = { toJSON: () => ({ id: 'j1', status: 'pending' }) };
    s.instances.set(s.keyFor(BackServiceSources.jobService), { findAll: () => [job] });

    expect(build(s).readers().jobs.catalog.list()).toEqual([{ id: 'j1', status: 'pending' }]);
  });

  it('when listing the job types, should read the type configuration from the back only then', () => {
    const s = setup();
    const readers = build(s).readers();

    expect(s.module).not.toHaveBeenCalledWith(BackPlainSources.jobTypeConfig[0]);
    expect(readers.jobs.catalog.listTypes()).toEqual(Object.values(s.jobTypeConfig));
    expect(s.module).toHaveBeenCalledWith(BackPlainSources.jobTypeConfig[0]);
  });

  it('when starting a job, should validate the hints with the back parser, create it and queue it with the right processor', () => {
    const s = setup();
    const job = { id: 'j1', status: 'pending' };
    const create = jest.fn().mockReturnValue(job);
    const run = jest.fn();
    const transcript = { name: 'transcript' };
    const summary = { name: 'summary' };
    s.instances.set(s.keyFor(BackServiceSources.jobService), { create, findAll: () => [] });
    s.instances.set(s.keyFor(BackServiceSources.jobRunner), { run });
    s.instances.set(s.keyFor(BackServiceSources.transcriptProcessor), transcript);
    s.instances.set(s.keyFor(BackServiceSources.summaryProcessor), summary);
    const { launcher } = build(s).readers().jobs;

    const created = launcher.startVideoToTranscript({ url: 'u', title: 'T' });

    expect(created).toEqual({ id: 'j1', status: 'pending' });
    expect(s.parseDocumentHints).toHaveBeenCalledWith({ url: 'u', title: 'T' });
    expect(create).toHaveBeenCalledWith('video-to-transcript', {
      parsed: { url: 'u', title: 'T' },
    });
    expect(run).toHaveBeenCalledWith(job, transcript, 'u');
  });
});
