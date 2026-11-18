import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogSections,
  DialogTitle,
} from './dialog';

function renderFlat() {
  render(
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Subtítulo</DialogDescription>
        </DialogHeader>

        <p>conteúdo longo</p>

        <DialogFooter>
          <button type="button">Cancelar</button>
          <button type="submit">Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
}

function renderForm() {
  render(
    <Dialog open>
      <DialogContent bare>
        <DialogForm onSubmit={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Título</DialogTitle>
          </DialogHeader>

          <p>campos do formulário</p>

          <DialogFooter>
            <button type="submit">Salvar</button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>,
  );
}

const body = () => screen.getByRole('dialog').querySelector('[data-slot=dialog-body]');

describe('DialogContent', () => {
  it('when the content is long, should scroll only the body and keep the popup inside the viewport', () => {
    renderFlat();

    const popup = screen.getByRole('dialog');

    expect(popup).toHaveClass('overflow-hidden', 'max-h-[calc(100dvh-2rem)]', 'flex-col');
    expect(popup).not.toHaveClass('overflow-y-auto');
    expect(body()).toHaveClass('overflow-y-auto', 'min-h-0', 'flex-1');
    expect(body()).toContainElement(screen.getByText('conteúdo longo'));
  });

  it('when scrolling, should keep the title, subtitle and the buttons outside the scrolling body', () => {
    renderFlat();

    const header = screen.getByText('Título').parentElement;
    const footer = screen.getByRole('button', { name: 'Confirmar' }).parentElement;

    expect(header).toContainElement(screen.getByText('Subtítulo'));
    expect(body()).not.toContainElement(header);
    expect(body()).not.toContainElement(footer);
    expect(header).toHaveClass('shrink-0');
    expect(footer).toHaveClass('shrink-0');
    expect(header?.className).not.toContain('sticky');
    expect(footer?.className).not.toContain('sticky');
  });

  it('when the children come in any order, should place the header first, the body in the middle and the footer last', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter>
            <button type="button">Ok</button>
          </DialogFooter>

          <p>miolo</p>

          <DialogHeader>
            <DialogTitle>Topo</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );

    const slots = Array.from(screen.getByRole('dialog').children).map((child) =>
      child.getAttribute('data-slot'),
    );

    expect(slots.slice(0, 3)).toEqual(['dialog-header', 'dialog-body', 'dialog-footer']);
  });

  it('when there is no content between the header and the footer, should not render an empty body', () => {
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

    expect(body()).toBeNull();
    expect(screen.getByText('Excluir').parentElement?.className).toContain(
      'has-[+[data-slot=dialog-footer]]:border-b-0',
    );
  });

  it('when the close button is shown, should keep it outside the scrolling body', () => {
    renderFlat();

    expect(body()).not.toContainElement(screen.getByRole('button', { name: 'Close' }));
  });

  it('when bodyClassName is given, should apply it to the scrolling body', () => {
    render(
      <Dialog open>
        <DialogContent bodyClassName="gap-0">
          <p>texto</p>
        </DialogContent>
      </Dialog>,
    );

    expect(body()).toHaveClass('gap-0');
  });

  it('when bare, should render the children as they are, for the caller to compose the sections', () => {
    render(
      <Dialog open>
        <DialogContent bare>
          <div data-testid="livre">livre</div>
        </DialogContent>
      </Dialog>,
    );

    expect(body()).toBeNull();
    expect(screen.getByRole('dialog')).toContainElement(screen.getByTestId('livre'));
  });
});

describe('DialogForm', () => {
  it('when used as the dialog content, should split the form into pinned header, scrolling body and pinned footer', () => {
    renderForm();

    const form = screen.getByRole('dialog').querySelector('form');

    expect(form).toHaveClass('flex', 'min-h-0', 'flex-1', 'flex-col');
    expect(body()).toContainElement(screen.getByText('campos do formulário'));
    expect(body()).not.toContainElement(screen.getByRole('button', { name: 'Salvar' }));
    expect(form).toContainElement(screen.getByRole('button', { name: 'Salvar' }));
  });
});

describe('DialogSections', () => {
  it('when used inside a custom component, should distribute header, body and footer the same way', () => {
    render(
      <Dialog open>
        <DialogContent bare>
          <DialogSections>
            <DialogHeader>
              <DialogTitle>Tela cheia</DialogTitle>
            </DialogHeader>

            <p>conteúdo</p>

            <DialogFooter>
              <button type="button">Fechar</button>
            </DialogFooter>
          </DialogSections>
        </DialogContent>
      </Dialog>,
    );

    expect(body()).toContainElement(screen.getByText('conteúdo'));
    expect(body()).not.toContainElement(screen.getByRole('button', { name: 'Fechar' }));
  });
});

describe('DialogBody', () => {
  it('when used on its own, should be the only scrolling area', () => {
    render(<DialogBody data-testid="miolo">texto</DialogBody>);

    expect(screen.getByTestId('miolo')).toHaveClass('overflow-y-auto', 'min-h-0', 'flex-1');
  });
});

describe('DialogBody (long content)', () => {
  it('when the content has a very long unbreakable line, should keep a shrinkable column and hide horizontal overflow', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
          </DialogHeader>

          <p>{'https://exemplo.com/'.padEnd(500, 'a')}</p>
        </DialogContent>
      </Dialog>,
    );

    const body = document.querySelector('[data-slot="dialog-body"]');

    expect(body).toHaveClass('grid-cols-[minmax(0,1fr)]');
    expect(body).toHaveClass('overflow-x-hidden');
    expect(body).toHaveClass('overflow-y-auto');
  });
});
