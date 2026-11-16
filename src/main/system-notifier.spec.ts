import { SystemNotifier, type SystemNotifierDeps } from './system-notifier';

function setup(overrides: Partial<SystemNotifierDeps> = {}) {
  const deps: SystemNotifierDeps = {
    isAppFocused: jest.fn(() => false),
    isSupported: jest.fn(() => true),
    show: jest.fn(),
    focusApp: jest.fn(),
    ...overrides,
  };

  return { deps, notifier: new SystemNotifier(deps) };
}

describe('SystemNotifier', () => {
  it('when the app is not focused, should show the notification', () => {
    const { notifier, deps } = setup();

    expect(notifier.notify({ title: 'Resumo concluído', body: 'Veja na biblioteca' })).toBe(true);
    expect(deps.show).toHaveBeenCalledWith(
      { title: 'Resumo concluído', body: 'Veja na biblioteca' },
      expect.any(Function),
    );
  });

  it('when the app is focused, should not notify (the on-screen notice is enough)', () => {
    const { notifier, deps } = setup({ isAppFocused: () => true });

    expect(notifier.notify({ title: 'a', body: 'b' })).toBe(false);
    expect(deps.show).not.toHaveBeenCalled();
  });

  it('when the system does not support notifications, should do nothing', () => {
    const { notifier, deps } = setup({ isSupported: () => false });

    expect(notifier.notify({ title: 'a', body: 'b' })).toBe(false);
    expect(deps.show).not.toHaveBeenCalled();
  });

  it('when the notification is clicked, should bring the app to the front', () => {
    const { notifier, deps } = setup();

    notifier.notify({ title: 'a', body: 'b' });
    const [, onClick] = (deps.show as jest.Mock<void, [unknown, () => void]>).mock.calls[0];

    onClick();

    expect(deps.focusApp).toHaveBeenCalledTimes(1);
  });

  it('when showing throws, should swallow the error', () => {
    const { notifier } = setup({
      show: () => {
        throw new Error('sem permissão');
      },
    });

    expect(notifier.notify({ title: 'a', body: 'b' })).toBe(false);
  });
});
