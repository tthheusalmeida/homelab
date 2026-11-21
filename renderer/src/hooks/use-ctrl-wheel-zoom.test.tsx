import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';

import { useCtrlWheelZoom } from './use-ctrl-wheel-zoom';

describe('useCtrlWheelZoom', () => {
  it('when Ctrl + wheel goes up, should zoom in one step and stop the default zoom', () => {
    const onStep = vi.fn();

    renderHook(() => useCtrlWheelZoom(onStep));

    const notPrevented = fireEvent.wheel(document.body, { ctrlKey: true, deltaY: -100 });

    expect(onStep).toHaveBeenCalledOnce();
    expect(onStep).toHaveBeenCalledWith(1);
    expect(notPrevented).toBe(false);
  });

  it('when Ctrl + wheel goes down, should zoom out', () => {
    const onStep = vi.fn();

    renderHook(() => useCtrlWheelZoom(onStep));
    fireEvent.wheel(document.body, { ctrlKey: true, deltaY: 100 });

    expect(onStep).toHaveBeenCalledWith(-1);
  });

  it('when the wheel is used without Ctrl, should leave the page scroll alone', () => {
    const onStep = vi.fn();

    renderHook(() => useCtrlWheelZoom(onStep));

    const notPrevented = fireEvent.wheel(document.body, { deltaY: -100 });

    expect(onStep).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it('when a touchpad sends small deltas, should add them up before taking a step', () => {
    const onStep = vi.fn();

    renderHook(() => useCtrlWheelZoom(onStep));

    for (let index = 0; index < 4; index += 1) {
      fireEvent.wheel(document.body, { ctrlKey: true, deltaY: -20 });
    }

    expect(onStep).not.toHaveBeenCalled();

    fireEvent.wheel(document.body, { ctrlKey: true, deltaY: -20 });

    expect(onStep).toHaveBeenCalledOnce();
  });

  it('when disabled, should do nothing', () => {
    const onStep = vi.fn();

    renderHook(() => useCtrlWheelZoom(onStep, false));
    fireEvent.wheel(document.body, { ctrlKey: true, deltaY: -100 });

    expect(onStep).not.toHaveBeenCalled();
  });

  it('when unmounted, should stop listening', () => {
    const onStep = vi.fn();

    renderHook(() => useCtrlWheelZoom(onStep)).unmount();
    fireEvent.wheel(document.body, { ctrlKey: true, deltaY: -100 });

    expect(onStep).not.toHaveBeenCalled();
  });
});
