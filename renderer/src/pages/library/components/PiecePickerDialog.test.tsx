import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PiecePickerDialog } from './PiecePickerDialog';

function setup(props: Partial<Parameters<typeof PiecePickerDialog>[0]> = {}) {
  const onPick = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <PiecePickerDialog
      open
      onOpenChange={onOpenChange}
      currentKey="financas.moedas"
      onPick={onPick}
      {...props}
    />,
  );

  return { onPick, onOpenChange };
}

describe('PiecePickerDialog', () => {
  it('when opened, should say which piece is being replaced', () => {
    setup();

    expect(screen.getByText('Trocar a peça')).toBeInTheDocument();
    expect(screen.getByText(/no lugar de “Pilha de moedas”/)).toBeInTheDocument();
  });

  it('when the place has no piece yet, should not name one', () => {
    setup({ currentKey: '' });

    expect(screen.getByText(/Escolha a peça deste espaço/)).toBeInTheDocument();
  });

  it('when opened, should list the bank of pieces with a search', () => {
    setup();

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText(/peças em 21 grupos/)).toBeInTheDocument();
  });

  it('when a piece is chosen, should hand its key over', async () => {
    const { onPick } = setup();

    await userEvent.click(
      within(screen.getByRole('region', { name: 'Saúde' })).getByRole('button', {
        name: /Cruz médica/,
      }),
    );

    expect(onPick).toHaveBeenCalledWith('saude.cruz');
  });

  it('when the current piece is in the list, should mark it as the selected one', () => {
    setup();

    expect(
      within(screen.getByRole('region', { name: 'Finanças' })).getByRole('button', {
        name: /Pilha de moedas/,
        pressed: true,
      }),
    ).toBeInTheDocument();
  });

  it('when searching, should narrow the pieces to choose from', async () => {
    setup();

    await userEvent.type(screen.getByRole('searchbox'), 'calculadora');

    expect(screen.getByRole('button', { name: /Calculadora/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cruz médica/ })).not.toBeInTheDocument();
  });

  it('when closed, should not show anything', () => {
    setup({ open: false });

    expect(screen.queryByText('Trocar a peça')).not.toBeInTheDocument();
  });
});

describe('PiecePickerDialog scrolling', () => {
  it('when the list scrolls, should keep the search fixed at the top of the dialog body', () => {
    setup();

    const row = screen.getByRole('searchbox').closest('.sticky') as HTMLElement;

    expect(row).toHaveClass('sticky', 'top-0', 'z-10', 'bg-popover');
    // sem o espaçamento de cima do miolo, as peças não aparecem entre o cabeçalho e a busca
    expect(screen.getByRole('dialog').querySelector('[data-slot=dialog-body]')).toHaveClass('pt-0');
    expect(screen.getByRole('dialog').querySelector('[data-slot=dialog-body]')).toContainElement(
      row,
    );
  });

  it('when searching, should keep the same height so the dialog does not jump', async () => {
    setup();

    const popup = screen.getByRole('dialog');

    expect(popup).toHaveClass('h-[min(44rem,calc(100dvh-2rem))]');

    await userEvent.type(screen.getByRole('searchbox'), 'calculadora');

    expect(popup).toHaveClass('h-[min(44rem,calc(100dvh-2rem))]');
  });

  it('when the list is long, should reserve the scrollbar space so the width does not change while scrolling', () => {
    setup();

    expect(screen.getByRole('dialog').querySelector('[data-slot=dialog-body]')).toHaveClass(
      '[scrollbar-gutter:stable]',
    );
  });

  it('when scrolling, should use only the scroll of the dialog body (no second scroll inside it)', () => {
    setup();

    const body = screen.getByRole('dialog').querySelector('[data-slot=dialog-body]') as HTMLElement;

    expect(body.querySelectorAll('.overflow-y-auto')).toHaveLength(0);
    expect(body.innerHTML).not.toContain('max-h-[60vh]');
  });
});
