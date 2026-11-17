import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowUp } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { SidebarNotice } from './SidebarNotice';

describe('SidebarNotice', () => {
  it('when rendered, should show the icon at the size of the sidebar icons, the title and the hint', () => {
    const { container } = render(
      <SidebarNotice icon={ArrowUp} title="Atualização 0.3.0" hint="Toque para ver." />,
    );

    const icon = container.querySelector('svg');

    expect(icon).toHaveClass('size-4', 'text-primary');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Atualização 0.3.0')).toHaveClass('text-[13px]', 'font-medium');
    expect(screen.getByText('Toque para ver.')).toHaveClass('text-[11px]');
  });

  it('when there is no onOpen, should not be a button', () => {
    render(<SidebarNotice icon={ArrowUp} title="Aviso" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('when onOpen is given, should make the body one button with the given name', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();

    render(
      <SidebarNotice
        icon={ArrowUp}
        title="Aviso"
        hint="Dica"
        progress={<div role="progressbar" />}
        onOpen={onOpen}
        openLabel="Abrir aviso"
      />,
    );

    const button = screen.getByRole('button', { name: 'Abrir aviso' });

    expect(button).toContainElement(screen.getByText('Aviso'));
    expect(button).toContainElement(screen.getByText('Dica'));
    expect(button).toContainElement(screen.getByRole('progressbar'));

    await user.click(button);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('when a progress bar is given, should place it between the title and the hint', () => {
    render(
      <SidebarNotice
        icon={ArrowUp}
        title="Aviso"
        hint="Dica"
        progress={<div data-testid="barra" />}
      />,
    );

    const title = screen.getByText('Aviso');
    const bar = screen.getByTestId('barra');
    const hint = screen.getByText('Dica');

    expect(title.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(bar.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('when an action is given, should show it below with full-width buttons', () => {
    render(
      <SidebarNotice icon={ArrowUp} title="Aviso" action={<button type="button">Reiniciar</button>} />,
    );

    const button = screen.getByRole('button', { name: 'Reiniciar' });

    expect(button.parentElement).toHaveClass('[&>button]:w-full');
  });

  it('when a role is given, should expose it (alerts for pending restart)', () => {
    render(<SidebarNotice role="alert" icon={ArrowUp} title="Aviso" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Aviso');
  });
});
