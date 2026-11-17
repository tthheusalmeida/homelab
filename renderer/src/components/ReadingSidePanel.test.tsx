import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReadingSidePanel } from './ReadingSidePanel';

const handle = () => screen.getByRole('button', { name: 'Mostrar painel lateral' });
const panel = () => screen.queryByRole('complementary', { name: 'Sumário da leitura' });

describe('ReadingSidePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('when idle, should show only the hover area and keep the panel hidden', () => {
    render(
      <ReadingSidePanel>
        <p>itens do sumário</p>
      </ReadingSidePanel>,
    );

    expect(handle()).toHaveAttribute('aria-expanded', 'false');
    expect(panel()).not.toBeInTheDocument();
    expect(screen.queryByText('itens do sumário')).not.toBeInTheDocument();
  });

  it('when the mouse enters the hover area, should open the panel', () => {
    render(
      <ReadingSidePanel>
        <p>itens do sumário</p>
      </ReadingSidePanel>,
    );

    fireEvent.mouseEnter(handle());

    expect(panel()).toBeInTheDocument();
    expect(screen.getByText('itens do sumário')).toBeInTheDocument();
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('when the mouse leaves the hover area, should close the panel after a short delay', () => {
    render(<ReadingSidePanel>conteúdo</ReadingSidePanel>);

    fireEvent.mouseEnter(handle());
    fireEvent.mouseLeave(handle());

    expect(panel()).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(panel()).not.toBeInTheDocument();
  });

  it('when the mouse goes from the hover area into the panel, should keep it open', () => {
    render(<ReadingSidePanel>conteúdo</ReadingSidePanel>);

    fireEvent.mouseEnter(handle());
    fireEvent.mouseLeave(handle());
    fireEvent.mouseEnter(panel()!);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(panel()).toBeInTheDocument();
  });

  it('when the mouse leaves the panel, should close it', () => {
    render(<ReadingSidePanel>conteúdo</ReadingSidePanel>);

    fireEvent.mouseEnter(handle());
    fireEvent.mouseEnter(panel()!);
    fireEvent.mouseLeave(panel()!);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(panel()).not.toBeInTheDocument();
  });

  it('when the hover area gets keyboard focus, should open the panel', () => {
    render(<ReadingSidePanel>conteúdo</ReadingSidePanel>);

    act(() => handle().focus());

    expect(panel()).toBeInTheDocument();
  });

  it('when focus leaves the panel, should close it', () => {
    render(
      <ReadingSidePanel>
        <button type="button">dentro</button>
      </ReadingSidePanel>,
    );

    fireEvent.mouseEnter(handle());
    act(() => screen.getByRole('button', { name: 'dentro' }).focus());
    act(() => screen.getByRole('button', { name: 'dentro' }).blur());

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(panel()).not.toBeInTheDocument();
  });

  it('when the hover area is clicked, should open the panel too', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ReadingSidePanel>conteúdo</ReadingSidePanel>);

    await user.click(handle());

    expect(panel()).toBeInTheDocument();
  });

  it('when unmounted while closing, should not leave a pending timer', () => {
    const { unmount } = render(<ReadingSidePanel>conteúdo</ReadingSidePanel>);

    fireEvent.mouseEnter(handle());
    fireEvent.mouseLeave(handle());
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
