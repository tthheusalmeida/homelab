import { buildStartupNotices, type StartupReports } from './startup-notices';

const clean = (): StartupReports => ({
  jobs: { interrupted: [], recoveredFromBackup: false, unreadable: false },
  chats: { recoveredFromBackup: false, unreadable: false },
  settingsRecoveredFromBackup: false,
});

describe('buildStartupNotices', () => {
  it('when everything is fine, should produce no notice', () => {
    expect(buildStartupNotices(clean())).toEqual([]);
  });

  it('when one job was interrupted, should warn in the singular with a link to the tasks', () => {
    const reports = clean();

    reports.jobs.interrupted = ['j1'];

    expect(buildStartupNotices(reports)).toEqual([
      {
        id: 'startup:jobs-interrupted',
        level: 'warning',
        title: '1 processo foi interrompido ao fechar o app',
        message: expect.stringContaining('falhos'),
        link: { label: 'Ver tarefas', path: '/jobs/track' },
      },
    ]);
  });

  it('when several jobs were interrupted, should say how many', () => {
    const reports = clean();

    reports.jobs.interrupted = ['a', 'b', 'c'];

    expect(buildStartupNotices(reports)[0].title).toBe(
      '3 processos foram interrompidos ao fechar o app',
    );
  });

  it.each([
    ['jobs', 'o histórico de processos'],
    ['chats', 'as conversas'],
  ] as const)(
    'when the %s file was recovered from the backup copy, should warn that the last copy was used',
    (key, what) => {
      const reports = clean();

      reports[key].recoveredFromBackup = true;

      expect(buildStartupNotices(reports)).toEqual([
        {
          id: `startup:${key}-recovered`,
          level: 'warning',
          title: `${what[0].toUpperCase()}${what.slice(1)} estava corrompido: usei a última cópia boa`,
          message: expect.stringContaining('.corrupt'),
        },
      ]);
    },
  );

  it('when the settings file was recovered from the backup copy, should warn', () => {
    const reports = clean();

    reports.settingsRecoveredFromBackup = true;

    expect(buildStartupNotices(reports)).toEqual([
      expect.objectContaining({
        id: 'startup:settings-recovered',
        level: 'warning',
        title: 'O arquivo de configurações estava corrompido: usei a última cópia boa',
      }),
    ]);
  });

  it.each([
    ['jobs', 'o histórico de processos'],
    ['chats', 'as conversas'],
  ] as const)(
    'when the %s file could not be read at all, should report an error saying it started empty',
    (key, what) => {
      const reports = clean();

      reports[key].unreadable = true;

      expect(buildStartupNotices(reports)).toEqual([
        {
          id: `startup:${key}-unreadable`,
          level: 'error',
          title: `Não foi possível ler ${what}: começou vazio`,
          message: expect.stringContaining('.corrupt'),
        },
      ]);
    },
  );

  it('when a file is unreadable, should not also say it was recovered', () => {
    const reports = clean();

    reports.jobs.unreadable = true;
    reports.jobs.recoveredFromBackup = true;

    expect(buildStartupNotices(reports).map((notice) => notice.id)).toEqual([
      'startup:jobs-unreadable',
    ]);
  });

  it('when several problems happen together, should produce one notice for each, with different ids', () => {
    const reports = clean();

    reports.jobs.interrupted = ['a'];
    reports.chats.unreadable = true;
    reports.settingsRecoveredFromBackup = true;

    const ids = buildStartupNotices(reports).map((notice) => notice.id);

    expect(ids).toEqual([
      'startup:jobs-interrupted',
      'startup:chats-unreadable',
      'startup:settings-recovered',
    ]);
  });
});

describe('buildStartupNotices: resumos de PDF', () => {
  it('when one interrupted job can be resumed, should say it kept what was ready', () => {
    const reports = clean();

    reports.jobs.interrupted = ['j1'];
    reports.jobs.resumable = 1;

    const [notice] = buildStartupNotices(reports);

    expect(notice.message).toContain('Tentar de novo');
    expect(notice.message).toContain('O resumo de PDF guardou');
  });

  it('when several can be resumed, should say how many', () => {
    const reports = clean();

    reports.jobs.interrupted = ['j1', 'j2', 'j3'];
    reports.jobs.resumable = 2;

    expect(buildStartupNotices(reports)[0].message).toContain('2 resumos de PDF guardaram');
  });

  it('when none can be resumed, should keep the usual message only', () => {
    const reports = clean();

    reports.jobs.interrupted = ['j1'];
    reports.jobs.resumable = 0;

    expect(buildStartupNotices(reports)[0].message).not.toContain('Tentar de novo');
  });
});
