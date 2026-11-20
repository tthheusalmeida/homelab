import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LazyRender } from '#components/LazyRender';

type Callback = (entries: { isIntersecting: boolean }[]) => void;

let callbacks: Callback[] = [];
const disconnect = vi.fn();

class FakeObserver {
  constructor(callback: Callback) {
    callbacks.push(callback);
  }
  observe = vi.fn();
  disconnect = disconnect;
}

describe('LazyRender', () => {
  beforeEach(() => {
    callbacks = [];
    disconnect.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('when the browser has no IntersectionObserver, should render the content right away', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<LazyRender>conteúdo</LazyRender>);

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('when still far from the screen, should keep only the reserved space', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);

    const { container } = render(<LazyRender className="w-16">conteúdo</LazyRender>);

    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="lazy-render"]')).toHaveClass('w-16');
    expect(container.querySelector('[data-slot="lazy-render"]')).toHaveAttribute(
      'data-ready',
      'false',
    );
  });

  it('when it gets near the screen, should mount the content and stop observing', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    render(<LazyRender>conteúdo</LazyRender>);

    act(() => callbacks[0]([{ isIntersecting: true }]));

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });

  it('when the entry is not intersecting, should keep waiting', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    render(<LazyRender>conteúdo</LazyRender>);

    act(() => callbacks[0]([{ isIntersecting: false }]));

    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
  });
});
