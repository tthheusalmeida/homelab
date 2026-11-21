import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { textField, type TextKind } from '#lib/infographic-text-edit';

import { TextEditDialog } from './TextEditDialog';

function setup(kind: TextKind, value: string, open = true) {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <TextEditDialog
      open={open}
      onOpenChange={onOpenChange}
      kind={kind}
      value={value}
      onSave={onSave}
    />,
  );

  return { onSave, onOpenChange };
}

describe('TextEditDialog', () => {
  it('when opened, should show the current text in a field and name what is being edited', () => {
    setup('item.title', 'Arrecadação');

    expect(screen.getByText('Editar o texto')).toBeInTheDocument();
    expect(screen.getByText('Título do item. Não pode ficar vazio.')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('Arrecadação');
  });

  it('when the text is required, should say it cannot be empty', () => {
    setup('title', 'Redes');

    expect(screen.getByText(/Não pode ficar vazio/)).toBeInTheDocument();
  });

  it('when the text is optional, should say that blank removes it', () => {
    setup('subtitle', 'Um subtítulo');

    expect(screen.getByText(/Deixe em branco para tirar/)).toBeInTheDocument();
  });

  it('when the text is short, should use a single line field; when it is long, a text area', () => {
    const { unmount } = render(
      <TextEditDialog open onOpenChange={vi.fn()} kind="item.tag" value="40%" onSave={vi.fn()} />,
    );

    expect(screen.getByRole('textbox').tagName).toBe('INPUT');
    unmount();

    render(
      <TextEditDialog
        open
        onOpenChange={vi.fn()}
        kind="item.text"
        value="Texto"
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
  });

  it('when typing, should count the characters against the limit of that text', async () => {
    setup('item.tag', '40%');

    expect(screen.getByLabelText('Caracteres usados')).toHaveTextContent(
      `3/${textField('item.tag').max}`,
    );

    await userEvent.type(screen.getByRole('textbox'), '0');

    expect(screen.getByLabelText('Caracteres usados')).toHaveTextContent(
      `4/${textField('item.tag').max}`,
    );
  });

  it('when typing past the limit, should not accept more characters', async () => {
    const max = textField('item.tag').max;

    setup('item.tag', '');
    await userEvent.type(screen.getByRole('textbox'), 'x'.repeat(max + 10));

    expect(screen.getByRole('textbox')).toHaveValue('x'.repeat(max));
  });

  it('when nothing changed, should keep Aplicar disabled', () => {
    setup('title', 'Redes');

    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  });

  it('when the text changed, should apply it trimmed and with single spaces', async () => {
    const { onSave } = setup('title', 'Redes');

    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), '  Redes   de   dados  ');
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onSave).toHaveBeenCalledWith('Redes de dados');
  });

  it('when pressing Enter in a single line field, should apply', async () => {
    const { onSave } = setup('title', 'Redes');

    await userEvent.type(screen.getByRole('textbox'), ' novas{Enter}');

    expect(onSave).toHaveBeenCalledWith('Redes novas');
  });

  it('when pressing Enter in a text area, should apply instead of breaking the line', async () => {
    const { onSave } = setup('item.text', 'Texto');

    await userEvent.type(screen.getByRole('textbox'), ' maior{Enter}');

    expect(onSave).toHaveBeenCalledWith('Texto maior');
    expect(screen.getByRole('textbox')).toHaveValue('Texto maior');
  });

  it('when a required text is emptied, should warn and not allow applying', async () => {
    const { onSave } = setup('title', 'Redes');

    await userEvent.clear(screen.getByRole('textbox'));

    expect(screen.getByRole('alert')).toHaveTextContent('Este texto não pode ficar vazio.');
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox'), '{Enter}');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('when an optional text is emptied, should allow applying a blank (it removes the text)', async () => {
    const { onSave } = setup('subtitle', 'Um subtítulo');

    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onSave).toHaveBeenCalledWith('');
  });

  it('when cancelling, should close without applying', async () => {
    const { onSave, onOpenChange } = setup('title', 'Redes');

    await userEvent.type(screen.getByRole('textbox'), ' x');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('when closed, should not show anything', () => {
    setup('title', 'Redes', false);

    expect(screen.queryByText('Editar o texto')).not.toBeInTheDocument();
  });
});

describe('TextEditDialog layout', () => {
  it('when opened, should keep the buttons in the fixed footer, outside the scrolling body', () => {
    setup('item.title', 'Arrecadação');

    const apply = screen.getByRole('button', { name: 'Aplicar' });
    const body = screen.getByRole('dialog').querySelector('[data-slot=dialog-body]');

    expect(apply.parentElement).toHaveAttribute('data-slot', 'dialog-footer');
    expect(body).not.toContainElement(apply);
    expect(body).toContainElement(screen.getByRole('textbox'));
  });
});
