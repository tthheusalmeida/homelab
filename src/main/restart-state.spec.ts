import { RestartState } from './restart-state';

describe('RestartState', () => {
  it('when nothing was marked, should not be pending', () => {
    expect(new RestartState(jest.fn()).isPending()).toBe(false);
  });

  it('when marked, should become pending and announce it', () => {
    const onChange = jest.fn();
    const state = new RestartState(onChange);

    state.mark();

    expect(state.isPending()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('when marked again, should keep pending and not announce twice', () => {
    const onChange = jest.fn();
    const state = new RestartState(onChange);

    state.mark();
    state.mark();

    expect(state.isPending()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
