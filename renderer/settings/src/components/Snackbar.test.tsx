import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  SNACKBAR_DURATION_MS,
  SNACKBAR_EXIT_MS,
  SnackbarProvider,
  useSnackbar,
} from './Snackbar';

function Trigger({ message }: { message: string }) {
  const snackbar = useSnackbar();

  return <button onClick={() => snackbar.show(message)}>mostrar {message}</button>;
}

const renderSnackbar = (messages: string[] = ['Salvo']) =>
  render(
    <SnackbarProvider>
      {messages.map((message) => (
        <Trigger key={message} message={message} />
      ))}
    </SnackbarProvider>,
  );

describe('Snackbar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('when nothing was shown, should render no message', () => {
    renderSnackbar();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when a message is shown, should appear in the bottom right corner', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar();

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));

    const snackbar = screen.getByRole('status');
    expect(snackbar).toHaveTextContent('Salvo');
    expect(snackbar).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('when raised, should sit above a fixed bottom bar instead of covering it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SnackbarProvider raised>
        <Trigger message="Salvo" />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));

    expect(screen.getByRole('status')).toHaveClass('bottom-20');
    expect(screen.getByRole('status')).not.toHaveClass('bottom-4');
  });

  it('when the duration passes, should disappear by itself', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar();

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));
    expect(screen.getByRole('status')).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(SNACKBAR_DURATION_MS + SNACKBAR_EXIT_MS + 50);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when the duration passes, should play the exit animation before leaving the page', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar();

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));
    expect(screen.getByRole('status')).toHaveClass('animate-enter');

    act(() => {
      vi.advanceTimersByTime(SNACKBAR_DURATION_MS + 10);
    });

    expect(screen.getByRole('status')).toHaveClass('animate-exit-down');
  });

  it('when the close button is clicked, should animate out and then disappear', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar();

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.getByRole('status')).toHaveClass('animate-exit-down');

    act(() => {
      vi.advanceTimersByTime(SNACKBAR_EXIT_MS + 10);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when a message is shown while another is leaving, should enter again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar(['Primeira', 'Segunda']);

    await user.click(screen.getByRole('button', { name: 'mostrar Primeira' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await user.click(screen.getByRole('button', { name: 'mostrar Segunda' }));

    expect(screen.getByRole('status')).toHaveClass('animate-enter');
    expect(screen.getByRole('status')).toHaveTextContent('Segunda');
  });

  it('when another message is shown, should replace the previous one and restart the timer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar(['Primeira', 'Segunda']);

    await user.click(screen.getByRole('button', { name: 'mostrar Primeira' }));
    act(() => {
      vi.advanceTimersByTime(SNACKBAR_DURATION_MS - 500);
    });
    await user.click(screen.getByRole('button', { name: 'mostrar Segunda' }));

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Segunda');

    act(() => {
      vi.advanceTimersByTime(SNACKBAR_DURATION_MS - 500);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Segunda');
  });

  it('when used outside the provider, should fail with a clear message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Trigger message="x" />)).toThrow(/SnackbarProvider/);

    spy.mockRestore();
  });
});
