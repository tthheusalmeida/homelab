import { SingleWindowController, type ManagedWindow } from './single-window';

function fakeWindow(overrides: Partial<ManagedWindow> = {}) {
  return {
    destroyed: false,
    minimized: false,
    isDestroyed() {
      return this.destroyed;
    },
    isMinimized() {
      return this.minimized;
    },
    restore: jest.fn(),
    focus: jest.fn(),
    ...overrides,
  };
}

describe('SingleWindowController', () => {
  it('when opening for the first time, should create the window', () => {
    const create = jest.fn(() => fakeWindow());

    new SingleWindowController(create).open();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('when the window is already open, should only focus it and not create another', () => {
    const window = fakeWindow();
    const create = jest.fn(() => window);
    const controller = new SingleWindowController(create);

    controller.open();
    controller.open();

    expect(create).toHaveBeenCalledTimes(1);
    expect(window.focus).toHaveBeenCalledTimes(1);
    expect(window.restore).not.toHaveBeenCalled();
  });

  it('when the window is minimized, should restore it before focusing', () => {
    const window = fakeWindow();
    const controller = new SingleWindowController(() => window);

    controller.open();
    window.minimized = true;
    controller.open();

    expect(window.restore).toHaveBeenCalledTimes(1);
    expect(window.focus).toHaveBeenCalledTimes(1);
  });

  it('when the previous window was closed, should create a new one', () => {
    const first = fakeWindow();
    const second = fakeWindow();
    const create = jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const controller = new SingleWindowController<ManagedWindow>(create);

    controller.open();
    first.destroyed = true;

    expect(controller.open()).toBe(second);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
