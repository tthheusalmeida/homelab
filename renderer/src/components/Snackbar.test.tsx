import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  SNACKBAR_DURATION_MS,
  SNACKBAR_ERROR_DURATION_MS,
  SNACKBAR_EXIT_MS,
  SnackbarProvider,
  useSnackbar,
} from './Snackbar';

function Trigger({ message }: { message: string }) {
  const snackbar = useSnackbar();

  return <button onClick={() => snackbar.show(message)}>mostrar {message}</button>;
}

function ErrorTrigger() {
  const snackbar = useSnackbar();

  return <button onClick={() => snackbar.error('Deu ruim')}>falhar</button>;
}

function CreatedTrigger({ onClick }: { onClick: () => void }) {
  const snackbar = useSnackbar();

  return (
    <button onClick={() => snackbar.created('Tarefa criada', { label: 'Acompanhar', onClick })}>
      criar
    </button>
  );
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
    expect(snackbar.closest('[data-region]')).toHaveAttribute('data-region', 'corner');
    expect(snackbar.closest('[data-region]')).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('when raised, should sit above a fixed bottom bar instead of covering it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SnackbarProvider raised>
        <Trigger message="Salvo" />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));

    const region = screen.getByRole('status').closest('[data-region]');
    expect(region).toHaveClass('bottom-20');
    expect(region).not.toHaveClass('bottom-4');
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

  it('when a message is shown, should show a progress bar lasting as long as the message', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderSnackbar();

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));

    const bar = screen.getByTestId('snackbar-progress');
    expect(bar).toHaveClass('animate-countdown');
    expect(bar).toHaveStyle({ animationDuration: `${SNACKBAR_DURATION_MS}ms` });
  });

  it('when an error is shown, should use an alert at the bottom center that stays longer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SnackbarProvider>
        <ErrorTrigger />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'falhar' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Deu ruim');
    expect(alert.closest('[data-region]')).toHaveAttribute('data-region', 'center');
    expect(screen.getByTestId('snackbar-progress')).toHaveStyle({
      animationDuration: `${SNACKBAR_ERROR_DURATION_MS}ms`,
    });

    act(() => {
      vi.advanceTimersByTime(SNACKBAR_DURATION_MS + SNACKBAR_EXIT_MS + 50);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('when something is created, should appear at the bottom center and run the action', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClick = vi.fn();
    render(
      <SnackbarProvider>
        <CreatedTrigger onClick={onClick} />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'criar' }));

    const snackbar = screen.getByRole('status');
    expect(snackbar.closest('[data-region]')).toHaveAttribute('data-region', 'center');
    expect(snackbar).toHaveTextContent('Tarefa criada');

    await user.click(screen.getByRole('button', { name: 'Acompanhar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(SNACKBAR_EXIT_MS + 10);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when a corner message and a creation are shown together, should keep both', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SnackbarProvider>
        <Trigger message="Salvo" />
        <CreatedTrigger onClick={vi.fn()} />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'mostrar Salvo' }));
    await user.click(screen.getByRole('button', { name: 'criar' }));

    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('when used outside the provider, should do nothing instead of failing', () => {
    render(<Trigger message="x" />);

    expect(() => screen.getByRole('button').click()).not.toThrow();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Snackbar error alert', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('when an error and a creation are shown together, should keep both stacked at the bottom center', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SnackbarProvider>
        <ErrorTrigger />
        <CreatedTrigger onClick={vi.fn()} />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'criar' }));
    await user.click(screen.getByRole('button', { name: 'falhar' }));

    const center = document.querySelector('[data-region=center]');

    expect(center).toContainElement(screen.getByRole('status'));
    expect(center).toContainElement(screen.getByRole('alert'));
  });

  it('when an error is shown, should not use the corner of the screen', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <SnackbarProvider>
        <ErrorTrigger />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'falhar' }));

    expect(document.querySelector('[data-region=corner]')).toBeEmptyDOMElement();
  });

  it('when the error has an action, should show a button that runs it and closes the alert', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const retry = vi.fn();

    function RetryTrigger() {
      const snackbar = useSnackbar();

      return (
        <button onClick={() => snackbar.error('Falhou', { label: 'Tentar de novo', onClick: retry })}>
          falhar
        </button>
      );
    }

    render(
      <SnackbarProvider>
        <RetryTrigger />
      </SnackbarProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'falhar' }));
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(retry).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(SNACKBAR_EXIT_MS + 10);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('when the regions are rendered, should be live regions above the dialogs', () => {
    render(<SnackbarProvider>{null}</SnackbarProvider>);

    for (const region of ['corner', 'center']) {
      const element = document.querySelector(`[data-region=${region}]`);

      expect(element).toHaveAttribute('aria-live', 'polite');
      expect(element).toHaveClass('z-[70]');
    }
  });
});
