import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DocumentActions } from './DocumentActions';

describe('DocumentActions', () => {
  it('when rendered, should show Modo leitura and Sobre a página as icons only', () => {
    render(<DocumentActions onStartReading={vi.fn()} onOpenAbout={vi.fn()} />);

    for (const name of ['Modo leitura', 'Sobre a página']) {
      const button = screen.getByRole('button', { name });

      expect(button).toHaveTextContent('');
      expect(button.querySelector('svg')).not.toBeNull();
    }
  });

  it('when the mouse goes over each button, should show a tooltip with its action', async () => {
    render(<DocumentActions onStartReading={vi.fn()} onOpenAbout={vi.fn()} />);

    await userEvent.hover(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(
      await screen.findByText('Modo leitura', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();

    await userEvent.unhover(screen.getByRole('button', { name: 'Modo leitura' }));
    await userEvent.hover(screen.getByRole('button', { name: 'Sobre a página' }));

    expect(
      await screen.findByText('Sobre a página', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it('when Modo leitura is clicked, should ask to start reading', async () => {
    const onStartReading = vi.fn();

    render(<DocumentActions onStartReading={onStartReading} onOpenAbout={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(onStartReading).toHaveBeenCalledTimes(1);
  });

  it('when Sobre a página is clicked, should ask to open the about window', async () => {
    const onOpenAbout = vi.fn();

    render(<DocumentActions onStartReading={vi.fn()} onOpenAbout={onOpenAbout} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sobre a página' }));

    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });
});
