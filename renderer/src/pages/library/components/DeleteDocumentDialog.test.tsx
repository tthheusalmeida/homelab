import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DocumentMeta } from '../types/library.types';

import { DeleteDocumentDialog, deletedMessage } from './DeleteDocumentDialog';

const meta = (
  type: DocumentMeta['type'] = 'summary',
  status: DocumentMeta['status'] = 'published',
): DocumentMeta => ({
  id: 'id1',
  title: 'Redes de computadores',
  type,
  source: 'video',
  status,
  category: ['TI'],
  tags: [],
  createdAt: '2026-03-05T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
});

function setup(
  props: Partial<Parameters<typeof DeleteDocumentDialog>[0]> = {},
  type: DocumentMeta['type'] = 'summary',
  status: DocumentMeta['status'] = 'published',
) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  render(
    <DeleteDocumentDialog
      open
      onOpenChange={onOpenChange}
      meta={meta(type, status)}
      isPending={false}
      onConfirm={onConfirm}
      {...props}
    />,
  );

  return { onConfirm, onOpenChange };
}

describe('DeleteDocumentDialog', () => {
  it('when it is a summary, should say it deletes the summary and its mind map with the edits, for good', () => {
    setup();

    expect(screen.getByText('Excluir o resumo?')).toBeInTheDocument();
    expect(screen.getByText(/Redes de computadores/)).toBeInTheDocument();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
    expect(screen.getByText('Será apagado:')).toBeInTheDocument();
    expect(screen.getByText(/O texto do resumo/)).toBeInTheDocument();
    expect(screen.getByText(/O mapa mental deste resumo/)).toBeInTheDocument();
    expect(screen.getByText(/todas as edições que você fez nele/)).toBeInTheDocument();
  });

  it('when it is a summary, should name both things in the confirm button', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'Excluir resumo e mapa mental' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['transcription', 'Excluir a transcrição?'],
    ['article', 'Excluir a criação?'],
  ] as const)('when it is a %s, should not mention a mind map', (type, title) => {
    setup({}, type);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByText(/mapa mental/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('when the page is published, should say it leaves the library and the books and offer Remover da biblioteca instead', () => {
    setup();

    expect(screen.getByText(/sai da biblioteca e dos livros/)).toBeInTheDocument();
    expect(screen.getByText(/Página indisponível/)).toBeInTheDocument();
    expect(screen.getByText(/Só quer tirar da biblioteca/)).toBeInTheDocument();
  });

  it.each(['pending', 'archived'] as const)(
    'when the page is %s, should not talk about the library or the books',
    (status) => {
      setup({}, 'summary', status);

      expect(screen.queryByText(/sai da biblioteca/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Só quer tirar da biblioteca/)).not.toBeInTheDocument();
    },
  );

  it('when confirmed, should ask to delete', async () => {
    const { onConfirm } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir resumo e mapa mental' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('when cancelled, should close without deleting', async () => {
    const { onConfirm, onOpenChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('when deleting is in progress, should disable both buttons', () => {
    setup({ isPending: true });

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Excluir resumo e mapa mental/ })).toBeDisabled();
  });

  it('when it failed, should show the error message', () => {
    setup({ errorMessage: 'Não foi possível excluir. Tente novamente.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível excluir.');
  });
});

describe('deletedMessage', () => {
  it('when a summary is deleted, should say the mind map went too', () => {
    expect(deletedMessage('summary')).toBe('Resumo e mapa mental excluídos');
  });

  it('when another type is deleted, should name the type', () => {
    expect(deletedMessage('transcription')).toBe('Transcrição excluída');
    expect(deletedMessage('article')).toBe('Criação excluída');
  });
});
