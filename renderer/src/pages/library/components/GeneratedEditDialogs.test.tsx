import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DiscardEditsDialog, RegenerateEditedDialog } from './GeneratedEditDialogs';

describe('DiscardEditsDialog', () => {
  it('when open, should ask to discard and show what is lost', () => {
    render(
      <DiscardEditsDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} description="Perde X." />,
    );

    expect(screen.getByText('Descartar as alterações?')).toBeInTheDocument();
    expect(screen.getByText('Perde X.')).toBeInTheDocument();
  });

  it('when confirmed, should call onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<DiscardEditsDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} description="x" />);

    await userEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('when closed, should render nothing', () => {
    render(<DiscardEditsDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} description="x" />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('RegenerateEditedDialog', () => {
  it.each(['mapa', 'infográfico'] as const)(
    'when the noun is %s, should name it in the warning',
    (noun) => {
      render(<RegenerateEditedDialog open noun={noun} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

      expect(screen.getByText(new RegExp(`Você editou este ${noun} à mão`))).toBeInTheDocument();
      expect(screen.getByText(/Não há como desfazer/)).toBeInTheDocument();
    },
  );

  it('when confirmed, should call onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<RegenerateEditedDialog open noun="mapa" onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Gerar de novo' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
