import { BackAlerts } from '../back/config/back-alerts';
import { FakeEventPublisher } from '../ipc/testing/fake-event-publisher';

import { EventBackAlerts } from './event-back-alerts';

describe('EventBackAlerts', () => {
  it('when created, should be a BackAlerts so the back can receive it', () => {
    expect(new EventBackAlerts(new FakeEventPublisher())).toBeInstanceOf(BackAlerts);
  });

  it('when a write fails, should publish an error notice naming what failed, with help and the technical reason', () => {
    const events = new FakeEventPublisher();

    new EventBackAlerts(events).persistFailed('o histórico de processos', 'disco cheio');

    expect(events.payloadsOf('app:notice')).toEqual([
      {
        id: 'persist-failed:o histórico de processos',
        level: 'error',
        title: 'Não foi possível gravar o histórico de processos',
        message: expect.stringContaining('espaço'),
        detail: 'disco cheio',
      },
    ]);
  });

  it('when the same write fails again, should reuse the notice id so the screen updates it instead of stacking', () => {
    const events = new FakeEventPublisher();
    const alerts = new EventBackAlerts(events);

    alerts.persistFailed('as conversas', 'a');
    alerts.persistFailed('as conversas', 'b');

    const ids = events.payloadsOf('app:notice').map((notice) => notice.id);

    expect(new Set(ids).size).toBe(1);
  });

  describe('job terminou', () => {
    it('when a job fails, should publish an error notice with the reason in the details and a link to the tasks', () => {
      const events = new FakeEventPublisher();

      new EventBackAlerts(events).jobFinished({
        id: 'j1',
        label: 'Resumo de vídeo',
        status: 'failed',
        error: 'Whisper CLI não encontrado',
      });

      expect(events.payloadsOf('app:notice')).toEqual([
        {
          id: 'job:j1',
          level: 'error',
          title: 'Resumo de vídeo falhou',
          message: expect.stringContaining('lista de tarefas'),
          detail: 'Whisper CLI não encontrado',
          link: { label: 'Ver tarefas', path: '/jobs/track' },
        },
      ]);
    });

    it('when a job completes, should publish a plain info notice without error details', () => {
      const events = new FakeEventPublisher();

      new EventBackAlerts(events).jobFinished({
        id: 'j2',
        label: 'Transcrição de vídeo',
        status: 'completed',
      });

      expect(events.payloadsOf('app:notice')).toEqual([
        {
          id: 'job:j2',
          level: 'info',
          title: 'Transcrição de vídeo concluído',
          link: { label: 'Ver tarefas', path: '/jobs/track' },
        },
      ]);
    });
  });
});
