import { IpcEvents } from '../shared/events';

import { WindowEventPublisher, type WindowLike } from './event-publisher';

const fakeWindow = (destroyed = false, fail = false) => {
  const send = jest.fn(() => {
    if (fail) {
      throw new Error('janela destruída');
    }
  });
  const window: WindowLike = { isDestroyed: () => destroyed, webContents: { send } };

  return { window, send };
};

const progress = { phase: 'running', processed: 1, total: 4 } as const;

describe('WindowEventPublisher', () => {
  it('when publishing, should send the event and payload to every open window', () => {
    const a = fakeWindow();
    const b = fakeWindow();

    new WindowEventPublisher(() => [a.window, b.window]).publish(
      IpcEvents.backupProgress,
      progress,
    );

    expect(a.send).toHaveBeenCalledWith('backup:progress', progress);
    expect(b.send).toHaveBeenCalledWith('backup:progress', progress);
  });

  it('when a window was already destroyed, should skip it and still reach the others', () => {
    const closed = fakeWindow(true);
    const open = fakeWindow();

    new WindowEventPublisher(() => [closed.window, open.window]).publish(
      IpcEvents.backupProgress,
      progress,
    );

    expect(closed.send).not.toHaveBeenCalled();
    expect(open.send).toHaveBeenCalledTimes(1);
  });

  it('when sending to one window throws, should still reach the next one', () => {
    const broken = fakeWindow(false, true);
    const open = fakeWindow();

    expect(() =>
      new WindowEventPublisher(() => [broken.window, open.window]).publish(
        IpcEvents.libraryMoveProgress,
        progress,
      ),
    ).not.toThrow();
    expect(open.send).toHaveBeenCalledWith('library-move:progress', progress);
  });

  it('when there is no open window, should do nothing', () => {
    expect(() =>
      new WindowEventPublisher(() => []).publish(IpcEvents.backupProgress, progress),
    ).not.toThrow();
  });

  it('when the event is not declared in IpcEvents, should fail right away', () => {
    expect(() =>
      new WindowEventPublisher(() => []).publish('x:y' as never, progress as never),
    ).toThrow(/não declarado/);
  });

  it('when publishing a notice, should send the notice payload as is', () => {
    const open = fakeWindow();
    const notice = { id: 'n1', level: 'error', title: 'Falhou' } as const;

    new WindowEventPublisher(() => [open.window]).publish(IpcEvents.notice, notice);

    expect(open.send).toHaveBeenCalledWith('app:notice', notice);
  });
});
