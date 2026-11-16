import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

function renderDialog() {
  render(
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Subtítulo</DialogDescription>
        </DialogHeader>

        <form>
          <p>conteúdo longo</p>

          <DialogFooter>
            <button type="button">Cancelar</button>
            <button type="submit">Confirmar</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>,
  );
}

describe('DialogContent: sem conteúdo entre cabeçalho e rodapé', () => {
  it('when the footer comes right after the header, should drop the gap and the header bottom border so no empty strip shows', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir</DialogTitle>
            <DialogDescription>Só texto.</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button type="button">Cancelar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    const scroll = screen.getByRole('dialog').querySelector('[data-slot=dialog-scroll]');
    const classes = scroll?.className ?? '';

    expect(classes).toContain('[&>[data-slot=dialog-header]:has(+[data-slot=dialog-footer])]:border-b-0');
    expect(classes).toContain('[&>[data-slot=dialog-header]+[data-slot=dialog-footer]]:-mt-4');
    expect(scroll?.children[0]).toHaveAttribute('data-slot', 'dialog-header');
    expect(scroll?.children[1]).toHaveAttribute('data-slot', 'dialog-footer');
  });
});

describe('DialogContent', () => {
  it('when the content is long, should scroll only the body and keep the popup inside the viewport', () => {
    renderDialog();

    const popup = screen.getByRole('dialog');
    const scroll = popup.querySelector('[data-slot=dialog-scroll]');

    expect(popup).toHaveClass('overflow-hidden', 'max-h-[calc(100dvh-2rem)]');
    expect(scroll).toHaveClass('overflow-y-auto', 'min-h-0');
    expect(scroll).toContainElement(screen.getByText('conteúdo longo'));
  });

  it('when scrolling, should keep the title, subtitle and the confirm and cancel buttons pinned', () => {
    renderDialog();

    const header = screen.getByText('Título').parentElement;
    const footer = screen.getByRole('button', { name: 'Confirmar' }).parentElement;

    expect(header).toHaveClass('sticky', 'top-[-1.25rem]');
    expect(header).toContainElement(screen.getByText('Subtítulo'));
    expect(footer).toHaveClass('sticky', 'bottom-[-1.25rem]');
  });

  it('when the footer is inside a form, should still pin it (it does not need to be a direct child)', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Cancelar' }).closest('form')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar' }).parentElement).toHaveClass('sticky');
  });

  it('when the close button is shown, should keep it outside the scrolling body', () => {
    renderDialog();

    const scroll = screen.getByRole('dialog').querySelector('[data-slot=dialog-scroll]');

    expect(scroll).not.toContainElement(screen.getByRole('button', { name: 'Close' }));
  });
});
