import { ChunkBatcher } from './chunk-batcher';

describe('ChunkBatcher', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('when pieces arrive fast, should deliver them together once per interval and in order', () => {
    const emit = jest.fn();
    const batcher = new ChunkBatcher(emit, 50);

    batcher.push('a');
    batcher.push('b');
    batcher.push('c');
    expect(emit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(emit).toHaveBeenCalledWith('abc');

    batcher.push('d');
    jest.advanceTimersByTime(50);
    expect(emit).toHaveBeenLastCalledWith('d');
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('when flushed, should deliver what is left at once and not again later', () => {
    const emit = jest.fn();
    const batcher = new ChunkBatcher(emit, 50);

    batcher.push('x');
    batcher.flush();
    jest.advanceTimersByTime(500);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('x');
  });

  it('when stopped, should drop what is left', () => {
    const emit = jest.fn();
    const batcher = new ChunkBatcher(emit, 50);

    batcher.push('x');
    batcher.stop();
    jest.advanceTimersByTime(500);

    expect(emit).not.toHaveBeenCalled();
  });

  it('when nothing was pushed, should not emit on flush', () => {
    const emit = jest.fn();

    new ChunkBatcher(emit).flush();

    expect(emit).not.toHaveBeenCalled();
  });
});
