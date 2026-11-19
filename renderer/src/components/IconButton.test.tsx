import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Download } from 'lucide-react';

import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('when rendered, should show only the icon and name the button by its action', () => {
    render(
      <IconButton label="Baixar como PNG">
        <Download />
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Baixar como PNG' });

    expect(button).toHaveTextContent('');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('when the mouse goes over it, should show a tooltip with the action', async () => {
    render(
      <IconButton label="Baixar como PNG">
        <Download />
      </IconButton>,
    );

    expect(
      screen.queryByText('Baixar como PNG', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeNull();

    await userEvent.hover(screen.getByRole('button', { name: 'Baixar como PNG' }));

    await waitFor(() =>
      expect(
        screen.getByText('Baixar como PNG', { selector: '[data-slot="tooltip-content"]' }),
      ).toBeInTheDocument(),
    );
  });

  it('when the mouse leaves, should hide the tooltip', async () => {
    render(
      <>
        <IconButton label="Ajustar">
          <Download />
        </IconButton>
        <p>fora</p>
      </>,
    );

    await userEvent.hover(screen.getByRole('button', { name: 'Ajustar' }));
    await screen.findByText('Ajustar', { selector: '[data-slot="tooltip-content"]' });

    await userEvent.unhover(screen.getByRole('button', { name: 'Ajustar' }));

    await waitFor(() =>
      expect(
        screen.queryByText('Ajustar', { selector: '[data-slot="tooltip-content"]' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('when clicked, should run the action', async () => {
    const onClick = vi.fn();

    render(
      <IconButton label="Ajustar" onClick={onClick}>
        <Download />
      </IconButton>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ajustar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('when disabled, should not run the action', async () => {
    const onClick = vi.fn();

    render(
      <IconButton label="Ajustar" disabled onClick={onClick}>
        <Download />
      </IconButton>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ajustar' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('when no variant is given, should be an outlined icon button', () => {
    render(
      <IconButton label="Ajustar">
        <Download />
      </IconButton>,
    );

    expect(screen.getByRole('button', { name: 'Ajustar' })).toHaveClass('size-8');
  });
});
