import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { LibraryInfographic } from '#shared/contracts/library';

const saved = vi.hoisted(() => ({
  state: { isPending: false, data: null as unknown },
}));
const generate = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { isPending: false, isError: false, error: null as Error | null },
}));
const del = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  state: { isPending: false, error: null as Error | null },
}));
const saveImage = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const snackbar = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const capture = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useLibrary', () => ({
  useInfographic: () => saved.state,
  useGenerateInfographic: () => ({ mutate: generate.mutate, ...generate.state }),
  useSaveMindMapImage: () => ({ mutateAsync: saveImage.mutateAsync }),
  useDeleteInfographic: () => ({ mutate: del.mutate, reset: del.reset, ...del.state }),
}));
vi.mock('#components/Snackbar', () => ({ useSnackbar: () => snackbar }));
vi.mock('#lib/infographic-image', () => ({ captureInfographicPng: capture }));

import { SummaryInfographic } from './SummaryInfographic';

const infographic: LibraryInfographic = {
  title: 'Como funciona',
  piece: 'tecnologia.wifi',
  sections: [
    {
      layout: 'steps',
      title: 'O caminho',
      piece: '',
      items: [
        { piece: 'tecnologia.chip', title: 'Primeiro passo', text: 'Texto 1' },
        { piece: 'tecnologia.nuvem', title: 'Segundo passo', text: 'Texto 2' },
        { piece: 'tecnologia.servidor', title: 'Terceiro passo', text: 'Texto 3' },
      ],
    },
    {
      layout: 'timeline',
      title: 'A história',
      piece: '',
      items: [
        { piece: 'espaco.lua', title: 'Marco A', text: 'a', tag: '1969' },
        { piece: 'espaco.foguete', title: 'Marco B', text: 'b', tag: '1990' },
        { piece: 'espaco.satelite', title: 'Marco C', text: 'c', tag: '2010' },
      ],
    },
  ],
  takeaways: ['Lembre disto'],
  model: 'gemini-x',
  createdAt: '2026-11-20T10:00:00.000Z',
  stale: false,
};

/** Uma página nova por teste: a geração automática lembra, na sessão, de quem já pediu. */
let currentId = '';
let pages = 0;

function renderTab() {
  return render(<SummaryInfographic documentId={currentId} title="Redes de computadores" />);
}

/** Abre e fecha a aba uma vez: gasta a geração automática da primeira abertura. */
function burnAutoRequest() {
  renderTab().unmount();
  generate.mutate.mockClear();
}

beforeEach(() => {
  cleanup();
  currentId = `doc${(pages += 1)}`;
  saved.state = { isPending: false, data: null };
  generate.mutate.mockReset();
  del.mutate
    .mockReset()
    .mockImplementation((_id: string, options?: { onSuccess?: () => void }) =>
      options?.onSuccess?.(),
    );
  del.reset.mockReset();
  del.state = { isPending: false, error: null };
  generate.state = { isPending: false, isError: false, error: null };
  saveImage.mutateAsync.mockReset().mockResolvedValue({ saved: true, path: 'D:/x.png' });
  capture.mockReset().mockResolvedValue('QUJD');
  snackbar.success.mockReset();
  snackbar.error.mockReset();
});

describe('SummaryInfographic', () => {
  it('when the infographic is loading, should show the loading state', () => {
    saved.state = { isPending: true, data: null };

    renderTab();

    expect(screen.getByText('Carregando o infográfico')).toBeInTheDocument();
  });

  it('when the tab opens for a summary without an infographic, should generate one by itself (the whole story, no fixed layout)', () => {
    renderTab();

    expect(generate.mutate).toHaveBeenCalledTimes(1);
    expect(generate.mutate).toHaveBeenCalledWith({ id: currentId });
  });

  it('when the tab opens again in the same session, should not call the AI again by itself', () => {
    renderTab().unmount();
    renderTab();

    expect(generate.mutate).toHaveBeenCalledTimes(1);
  });

  it('when there is already an infographic, should show it and wait for the user to ask for a new one', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(generate.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Primeiro passo')).toBeInTheDocument();
  });

  it('when it is still loading what was saved, should not generate yet', () => {
    saved.state = { isPending: true, data: null };

    renderTab();

    expect(generate.mutate).not.toHaveBeenCalled();
  });

  it('when the first automatic try is over and there is still nothing, should invite the user to generate with the button', () => {
    burnAutoRequest();

    renderTab();

    expect(screen.getByText('Este resumo ainda não tem infográfico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar infográfico/ })).toBeInTheDocument();
    expect(generate.mutate).not.toHaveBeenCalled();
  });

  it('when the user clicks Gerar with the automatic model, should ask the AI without a layout', async () => {
    burnAutoRequest();
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: /Gerar infográfico/ }));

    expect(generate.mutate).toHaveBeenCalledWith({ id: currentId, layout: undefined });
  });

  it('when there is a single section, should say "1 seção"', () => {
    saved.state = {
      isPending: false,
      data: { ...infographic, sections: [infographic.sections[0]] },
    };

    renderTab();

    expect(screen.getByText('1 seção')).toBeInTheDocument();
  });

  it('when the user chooses a model and generates, should send that layout', async () => {
    burnAutoRequest();
    renderTab();

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Só: Funil' }));
    await userEvent.click(screen.getByRole('button', { name: /Gerar infográfico/ }));

    expect(generate.mutate).toHaveBeenCalledWith({ id: currentId, layout: 'funnel' });
  });

  it('when the AI is working and there is nothing yet, should show the generating state and disable the button', () => {
    generate.state = { isPending: true, isError: false, error: null };

    renderTab();

    expect(screen.getByText('Montando o infográfico com a IA')).toBeInTheDocument();
    expect(screen.queryByText('Este resumo ainda não tem infográfico')).not.toBeInTheDocument();
  });

  it('when there is an infographic, should draw the whole story (every section and the closing) with the number of sections', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(screen.getByText('Primeiro passo')).toBeInTheDocument();
    expect(screen.getByText('Marco B')).toBeInTheDocument();
    expect(screen.getByText('Lembre disto')).toBeInTheDocument();
    expect(screen.getByText('2 seções')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar de novo/ })).toBeInTheDocument();
  });

  it('when the user generates again, should ask the AI again with the chosen model', async () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();
    await userEvent.click(screen.getByRole('button', { name: /Gerar de novo/ }));

    expect(generate.mutate).toHaveBeenCalledWith({ id: currentId, layout: undefined });
  });

  it('when the AI fails, should show the reason in Portuguese with a retry button inside the message', async () => {
    burnAutoRequest();
    generate.state = {
      isPending: false,
      isError: true,
      error: new Error('O limite de uso foi atingido.'),
    };

    renderTab();

    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent(
      'Não foi possível gerar com a IA: O limite de uso foi atingido.',
    );

    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));

    expect(generate.mutate).toHaveBeenCalledTimes(1);
  });

  it('when the AI fails and there was an infographic, should keep showing it and say so', () => {
    saved.state = { isPending: false, data: infographic };
    generate.state = { isPending: false, isError: true, error: new Error('sem internet') };

    renderTab();

    expect(screen.getByRole('alert')).toHaveTextContent('O infográfico anterior continua aqui.');
    expect(screen.getByText('Primeiro passo')).toBeInTheDocument();
  });

  it('when the summary changed after generating, should warn and offer to update with the AI', async () => {
    saved.state = { isPending: false, data: { ...infographic, stale: true } };

    renderTab();

    expect(screen.getByRole('status')).toHaveTextContent(
      'O resumo mudou depois que este infográfico foi gerado.',
    );

    await userEvent.click(screen.getByRole('button', { name: /Atualizar com IA/ }));

    expect(generate.mutate).toHaveBeenCalledTimes(1);
  });

  describe('download', () => {
    beforeEach(() => {
      saved.state = { isPending: false, data: infographic };
    });

    it('when downloading with background, should photograph the frame and send the PNG with a suggested name', async () => {
      renderTab();

      await userEvent.click(
        screen.getByRole('button', { name: 'Baixar o infográfico como PNG com fundo' }),
      );

      await waitFor(() =>
        expect(snackbar.success).toHaveBeenCalledWith('Imagem do infográfico salva.'),
      );
      expect(capture).toHaveBeenCalledWith(expect.any(HTMLElement), false);
      expect(saveImage.mutateAsync).toHaveBeenCalledWith({
        fileName: 'Infográfico - Redes de computadores',
        dataBase64: 'QUJD',
      });
    });

    it('when downloading without background, should ask for a transparent image and say so in the name', async () => {
      renderTab();

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Baixar o infográfico como PNG sem fundo (transparente)',
        }),
      );

      await waitFor(() => expect(saveImage.mutateAsync).toHaveBeenCalled());
      expect(capture).toHaveBeenCalledWith(expect.any(HTMLElement), true);
      expect(saveImage.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: 'Infográfico - Redes de computadores (sem fundo)' }),
      );
    });

    it('when the user closes the save dialog, should say nothing', async () => {
      saveImage.mutateAsync.mockResolvedValue({ saved: false });

      renderTab();
      await userEvent.click(
        screen.getByRole('button', { name: 'Baixar o infográfico como PNG com fundo' }),
      );

      await waitFor(() => expect(saveImage.mutateAsync).toHaveBeenCalled());
      expect(snackbar.success).not.toHaveBeenCalled();
      expect(snackbar.error).not.toHaveBeenCalled();
    });

    it('when the image cannot be made, should show the error message', async () => {
      capture.mockRejectedValue(new Error('falhou a foto'));

      renderTab();
      await userEvent.click(
        screen.getByRole('button', { name: 'Baixar o infográfico como PNG com fundo' }),
      );

      await waitFor(() => expect(snackbar.error).toHaveBeenCalledWith('falhou a foto'));
      expect(saveImage.mutateAsync).not.toHaveBeenCalled();
    });

    it('when the error has no message, should use a generic one', async () => {
      capture.mockRejectedValue('x');

      renderTab();
      await userEvent.click(
        screen.getByRole('button', { name: 'Baixar o infográfico como PNG com fundo' }),
      );

      await waitFor(() =>
        expect(snackbar.error).toHaveBeenCalledWith(
          'Não foi possível gerar a imagem do infográfico.',
        ),
      );
    });

    it('when there is no infographic yet, should not offer the download buttons', () => {
      saved.state = { isPending: false, data: null };

      renderTab();

      expect(
        screen.queryByRole('button', { name: /Baixar o infográfico/ }),
      ).not.toBeInTheDocument();
    });
  });
});

describe('SummaryInfographic delete', () => {
  const deleteButton = () => screen.getByRole('button', { name: 'Excluir só o infográfico' });

  it('when there is an infographic, should offer a delete button that says it is only the infographic', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(deleteButton()).toBeInTheDocument();
  });

  it('when there is no infographic, should not offer to delete', () => {
    burnAutoRequest();

    renderTab();

    expect(
      screen.queryByRole('button', { name: 'Excluir só o infográfico' }),
    ).not.toBeInTheDocument();
  });

  it('when clicking delete, should ask first and say what stays', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();

    await userEvent.click(deleteButton());

    expect(screen.getByText('Excluir só o infográfico?')).toBeInTheDocument();
    expect(screen.getByText(/O texto do resumo e o mapa mental/)).toBeInTheDocument();
    expect(del.mutate).not.toHaveBeenCalled();
  });

  it('when the user cancels, should delete nothing', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await userEvent.click(deleteButton());

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(del.mutate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('Excluir só o infográfico?')).not.toBeInTheDocument(),
    );
  });

  it('when the user confirms, should delete only the infographic and not ask the AI for another one', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await userEvent.click(deleteButton());

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir só o infográfico' }),
    );

    expect(del.mutate).toHaveBeenCalledWith(currentId, expect.any(Object));
    expect(snackbar.success).toHaveBeenCalledWith('Infográfico excluído.');

    // sem infográfico guardado, a aba mostra o estado vazio sem gerar outro sozinha
    cleanup();
    saved.state = { isPending: false, data: null };
    renderTab();

    expect(generate.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Este resumo ainda não tem infográfico')).toBeInTheDocument();
  });

  it('when deleting fails, should show the reason inside the dialog and keep it open', async () => {
    saved.state = { isPending: false, data: infographic };
    del.mutate.mockReset();
    del.state = { isPending: false, error: new Error('Falha ao apagar') };
    renderTab();

    await userEvent.click(deleteButton());

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao apagar');
    expect(screen.getByText('Excluir só o infográfico?')).toBeInTheDocument();
  });

  it('when the AI is generating, should not allow deleting', () => {
    saved.state = { isPending: false, data: infographic };
    generate.state = { isPending: true, isError: false, error: null };

    renderTab();

    expect(deleteButton()).toBeDisabled();
  });
});
