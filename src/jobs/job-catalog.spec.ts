import { JobCatalog, toWire } from './job-catalog';

/** Entidade como a do back: campos privados, getters no protótipo e `toJSON`. */
class FakeJob {
  private readonly _status = 'running';
  readonly createdAt = new Date('2026-11-15T10:00:00.000Z');

  constructor(readonly id: string) {}

  get status() {
    return this._status;
  }

  toJSON() {
    return { id: this.id, status: this.status, createdAt: this.createdAt, error: undefined };
  }
}

describe('toWire', () => {
  it('when the value is an entity with toJSON, should answer the same plain object the HTTP answered', () => {
    expect(toWire(new FakeJob('j1'))).toEqual({
      id: 'j1',
      status: 'running',
      createdAt: '2026-11-15T10:00:00.000Z',
    });
  });

  it('when a field is undefined, should drop it like JSON does', () => {
    expect(toWire({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('when the value is a plain object, should answer an independent copy', () => {
    const original = { steps: [{ name: 'a' }] };
    const copy = toWire<typeof original>(original);

    copy.steps[0].name = 'b';

    expect(original.steps[0].name).toBe('a');
  });
});

describe('JobCatalog', () => {
  const types = {
    'video-to-transcript': {
      type: 'video-to-transcript',
      label: 'Transcrição de vídeo',
      description: 'Baixa, transcreve e salva.',
      steps: [{ name: 'download-video', label: 'Baixar vídeo' }],
    },
    'video-to-summary': {
      type: 'video-to-summary',
      label: 'Resumo de vídeo',
      description: 'Baixa, transcreve, resume e salva.',
      steps: [],
    },
  };

  function setup(jobs: FakeJob[] = [new FakeJob('j1'), new FakeJob('j2')]) {
    const store = {
      findAll: jest.fn(() => jobs),
      findById: jest.fn((id: string) => {
        const job = jobs.find((item) => item.id === id);

        if (!job) {
          throw new Error(`Job "${id}" não encontrado`);
        }

        return job;
      }),
    };
    const typeConfig = jest.fn(() => types);

    return { catalog: new JobCatalog(store, typeConfig), store, typeConfig };
  }

  it('when listing, should answer every job in the transport format', () => {
    const { catalog } = setup();

    expect(catalog.list()).toEqual([
      { id: 'j1', status: 'running', createdAt: '2026-11-15T10:00:00.000Z' },
      { id: 'j2', status: 'running', createdAt: '2026-11-15T10:00:00.000Z' },
    ]);
  });

  it('when there are no jobs, should answer an empty list', () => {
    expect(setup([]).catalog.list()).toEqual([]);
  });

  it('when getting a job by id, should ask the store and answer it in the transport format', () => {
    const { catalog, store } = setup();

    expect(catalog.get('j2')).toMatchObject({ id: 'j2', createdAt: '2026-11-15T10:00:00.000Z' });
    expect(store.findById).toHaveBeenCalledWith('j2');
  });

  it('when the job does not exist, should let the store error through', () => {
    expect(() => setup().catalog.get('zz')).toThrow('Job "zz" não encontrado');
  });

  it('when listing the types, should answer each configuration as a plain object', () => {
    const { catalog } = setup();

    expect(catalog.listTypes()).toEqual(Object.values(types));
  });

  it('when the catalog is created, should not read the type configuration until it is asked', () => {
    const { typeConfig } = setup();

    expect(typeConfig).not.toHaveBeenCalled();
  });
});
