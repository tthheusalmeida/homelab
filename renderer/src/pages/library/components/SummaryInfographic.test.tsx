import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { dismissGeneration, isGenerationDismissed } from '#lib/dismissed-generation';
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
const saveInfo = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const saveImage = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const snackbar = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const capture = vi.hoisted(() => vi.fn());
const capturePdf = vi.hoisted(() => vi.fn());
const captureSvg = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useLibrary', () => ({
  useInfographic: () => saved.state,
  useGenerateInfographic: () => ({ mutate: generate.mutate, ...generate.state }),
  useSaveMindMapImage: () => ({ mutateAsync: saveImage.mutateAsync }),
  useDeleteInfographic: () => ({ mutate: del.mutate, reset: del.reset, ...del.state }),
  useSaveInfographic: () => ({ mutateAsync: saveInfo.mutateAsync, isPending: saveInfo.isPending }),
}));
vi.mock('#components/Snackbar', () => ({ useSnackbar: () => snackbar }));
vi.mock('#lib/infographic-image', () => ({
  captureInfographicPng: capture,
  captureInfographicPdf: capturePdf,
  captureInfographicSvg: captureSvg,
}));

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
  saveInfo.mutateAsync.mockReset().mockResolvedValue({});
  saveInfo.isPending = false;
  del.state = { isPending: false, error: null };
  generate.state = { isPending: false, isError: false, error: null };
  saveImage.mutateAsync.mockReset().mockResolvedValue({ saved: true, path: 'D:/x.png' });
  capture.mockReset().mockResolvedValue('QUJD');
  capturePdf.mockReset().mockResolvedValue('UERG');
  captureSvg.mockReset().mockResolvedValue('U1ZH');
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
        format: 'png',
      });
    });

    it('when downloading the PDF, should build it from the frame and save it as a PDF', async () => {
      renderTab();

      await userEvent.click(screen.getByRole('button', { name: 'Baixar o infográfico como PDF' }));

      await waitFor(() =>
        expect(snackbar.success).toHaveBeenCalledWith('PDF do infográfico salvo.'),
      );
      expect(capturePdf).toHaveBeenCalledWith(expect.any(HTMLElement));
      expect(saveImage.mutateAsync).toHaveBeenCalledWith({
        fileName: 'Infográfico - Redes de computadores',
        dataBase64: 'UERG',
        format: 'pdf',
      });
    });

    it('when downloading the SVG, should capture it with the frame background and save it as an SVG', async () => {
      renderTab();

      await userEvent.click(
        screen.getByRole('button', { name: 'Baixar o infográfico como SVG (vetor)' }),
      );

      await waitFor(() =>
        expect(snackbar.success).toHaveBeenCalledWith('Imagem do infográfico salva.'),
      );
      expect(captureSvg).toHaveBeenCalledWith(expect.any(HTMLElement), false);
      expect(saveImage.mutateAsync).toHaveBeenCalledWith({
        fileName: 'Infográfico - Redes de computadores',
        dataBase64: 'U1ZH',
        format: 'svg',
      });
    });

    it('when the PDF cannot be made, should show the error and save nothing', async () => {
      capturePdf.mockRejectedValue(new Error('falhou o pdf'));

      renderTab();
      await userEvent.click(screen.getByRole('button', { name: 'Baixar o infográfico como PDF' }));

      await waitFor(() => expect(snackbar.error).toHaveBeenCalledWith('falhou o pdf'));
      expect(saveImage.mutateAsync).not.toHaveBeenCalled();
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

  it('when the user deleted it on purpose before (even in another session), should not generate by itself and let the button generate again', async () => {
    dismissGeneration('infographic', currentId);
    renderTab();

    expect(generate.mutate).not.toHaveBeenCalled();
    expect(screen.getByText('Este resumo ainda não tem infográfico')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Gerar infográfico/ }));

    expect(generate.mutate).toHaveBeenCalledTimes(1);
    expect(isGenerationDismissed('infographic', currentId)).toBe(false);
  });

  it('when the user confirms the delete, should remember it for the next sessions', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await userEvent.click(deleteButton());
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir só o infográfico' }),
    );

    expect(isGenerationDismissed('infographic', currentId)).toBe(true);
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

describe('SummaryInfographic edit', { timeout: 20_000 }, () => {
  const editButton = () => screen.getByRole('button', { name: 'Editar as peças' });
  const pieceButtons = () => screen.getAllByRole('button', { name: /^Trocar a peça:/ });
  const startEditing = async () => userEvent.click(editButton());
  const swapFirstPiece = async (name: RegExp = /Cruz médica/) => {
    await userEvent.click(pieceButtons()[0]);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  };

  it('when there is an infographic, should offer to edit the pieces', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(editButton()).toBeInTheDocument();
  });

  it('when there is no infographic, should not offer to edit', () => {
    burnAutoRequest();

    renderTab();

    expect(screen.queryByRole('button', { name: 'Editar as peças' })).not.toBeInTheDocument();
  });

  it('when not editing, should not make the pieces clickable', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(screen.queryAllByRole('button', { name: /^Trocar a peça:/ })).toHaveLength(0);
  });

  it('when editing starts, should make the pieces buttons, show the hint and hide generating and downloading', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();

    await startEditing();

    expect(pieceButtons().length).toBeGreaterThan(3);
    expect(screen.getByText(/Clique em uma peça para trocá-la/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gerar de novo' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Estrutura do infográfico')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Baixar o infográfico/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('when a piece is clicked and another one is chosen, should show the new piece and allow saving', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();

    await swapFirstPiece();

    expect(screen.getByRole('img', { name: 'Cruz médica' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  it('when saving, should send the edited content without the fields of the server and leave editing', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await swapFirstPiece();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(saveInfo.mutateAsync).toHaveBeenCalledTimes(1));

    const [payload] = saveInfo.mutateAsync.mock.calls[0] as [
      { id: string; infographic: Record<string, unknown> },
    ];

    expect(payload.id).toBe(currentId);
    expect(payload.infographic.piece).toBe('saude.cruz');
    expect(payload.infographic).not.toHaveProperty('model');
    expect(payload.infographic).not.toHaveProperty('stale');
    await waitFor(() => expect(snackbar.success).toHaveBeenCalledWith('Infográfico salvo.'));
    expect(screen.getByRole('button', { name: 'Editar as peças' })).toBeInTheDocument();
  });

  it('when saving fails, should show the reason and stay in edition with the change', async () => {
    saved.state = { isPending: false, data: infographic };
    saveInfo.mutateAsync.mockRejectedValue(new Error('Não foi possível salvar.'));
    renderTab();
    await startEditing();
    await swapFirstPiece();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(snackbar.error).toHaveBeenCalledWith('Não foi possível salvar.'));
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cruz médica' })).toBeInTheDocument();
  });

  it('when cancelling without changes, should leave editing at once', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByRole('button', { name: 'Editar as peças' })).toBeInTheDocument();
    expect(screen.queryByText('Descartar as alterações?')).not.toBeInTheDocument();
  });

  it('when cancelling after changes, should ask before throwing them away', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await swapFirstPiece();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByText('Descartar as alterações?')).toBeInTheDocument();
    expect(saveInfo.mutateAsync).not.toHaveBeenCalled();
  });

  it('when the user confirms discarding, should go back to the saved pieces', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await swapFirstPiece();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    await userEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));

    expect(screen.getByRole('button', { name: 'Editar as peças' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Cruz médica' })).not.toBeInTheDocument();
    expect(saveInfo.mutateAsync).not.toHaveBeenCalled();
  });

  it('when the user leaves the tab in the middle of an edit and comes back, should resume the same draft', async () => {
    saved.state = { isPending: false, data: infographic };
    const first = renderTab();
    await startEditing();
    await swapFirstPiece();
    first.unmount();

    renderTab();

    expect(screen.getByRole('img', { name: 'Cruz médica' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  it('when the infographic was edited, should say so', () => {
    saved.state = { isPending: false, data: { ...infographic, edited: true } };

    renderTab();

    expect(screen.getByText('Editado')).toBeInTheDocument();
  });

  it('when the infographic was not edited, should not say so', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(screen.queryByText('Editado')).not.toBeInTheDocument();
  });

  it('when generating again an edited infographic, should ask before losing the edits', async () => {
    saved.state = { isPending: false, data: { ...infographic, edited: true } };
    burnAutoRequest();
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'Gerar de novo' }));

    expect(screen.getByText('Gerar de novo e perder as suas edições?')).toBeInTheDocument();
    expect(generate.mutate).not.toHaveBeenCalled();
  });

  it('when the user confirms generating again, should ask the AI', async () => {
    saved.state = { isPending: false, data: { ...infographic, edited: true } };
    burnAutoRequest();
    renderTab();
    await userEvent.click(screen.getByRole('button', { name: 'Gerar de novo' }));

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Gerar de novo' }),
    );

    expect(generate.mutate).toHaveBeenCalledTimes(1);
  });

  it('when generating again an infographic that was not edited, should not ask', async () => {
    saved.state = { isPending: false, data: infographic };
    burnAutoRequest();
    renderTab();

    await userEvent.click(screen.getByRole('button', { name: 'Gerar de novo' }));

    expect(screen.queryByText('Gerar de novo e perder as suas edições?')).not.toBeInTheDocument();
    expect(generate.mutate).toHaveBeenCalledTimes(1);
  });

  it('when the AI is generating, should not allow editing', () => {
    saved.state = { isPending: false, data: infographic };
    generate.state = { isPending: true, isError: false, error: null };

    renderTab();

    expect(editButton()).toBeDisabled();
  });
});

describe('SummaryInfographic text edit', { timeout: 20_000 }, () => {
  const startEditing = async () =>
    userEvent.click(screen.getByRole('button', { name: 'Editar as peças' }));
  const textButton = (text: string) =>
    screen
      .getAllByTitle('Editar este texto')
      .find((element) => element.textContent === text) as HTMLElement;
  const dialog = () => within(screen.getByRole('dialog'));
  const gone = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  it('when editing, should say that texts can be edited too', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();

    await startEditing();

    expect(screen.getByText(/ou em um texto para editá-lo/)).toBeInTheDocument();
  });

  it('when a text is clicked, should open the text editor with the current text', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();

    await userEvent.click(textButton('Primeiro passo'));

    expect(screen.getByText('Editar o texto')).toBeInTheDocument();
    expect(dialog().getByRole('textbox')).toHaveValue('Primeiro passo');
  });

  it('when a text is applied, should show it in the infographic and allow saving', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await userEvent.click(textButton('Primeiro passo'));

    await userEvent.clear(dialog().getByRole('textbox'));
    await userEvent.type(dialog().getByRole('textbox'), 'Passo inicial');
    await userEvent.click(dialog().getByRole('button', { name: 'Aplicar' }));
    await gone();

    expect(screen.getByText('Passo inicial')).toBeInTheDocument();
    expect(screen.queryByText('Primeiro passo')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
  });

  it('when saving after editing a text, should send the new text with the unchanged rest', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await userEvent.click(textButton('Primeiro passo'));
    await userEvent.clear(dialog().getByRole('textbox'));
    await userEvent.type(dialog().getByRole('textbox'), 'Passo inicial');
    await userEvent.click(dialog().getByRole('button', { name: 'Aplicar' }));
    await gone();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(saveInfo.mutateAsync).toHaveBeenCalledTimes(1));

    const [payload] = saveInfo.mutateAsync.mock.calls[0] as [
      { infographic: { sections: Array<{ items: Array<{ title: string; piece: string }> }> } },
    ];

    expect(payload.infographic.sections[0].items[0].title).toBe('Passo inicial');
    expect(payload.infographic.sections[0].items[0].piece).toBe('tecnologia.chip');
    expect(payload.infographic.sections[0].items[1].title).toBe('Segundo passo');
  });

  it('when a text and a piece are changed, should keep both in the draft', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await userEvent.click(textButton('Primeiro passo'));
    await userEvent.clear(dialog().getByRole('textbox'));
    await userEvent.type(dialog().getByRole('textbox'), 'Passo inicial');
    await userEvent.click(dialog().getByRole('button', { name: 'Aplicar' }));
    await gone();

    await userEvent.click(screen.getAllByRole('button', { name: /^Trocar a peça:/ })[0]);
    await userEvent.click(dialog().getByRole('button', { name: /Cruz médica/ }));
    await gone();

    expect(screen.getByText('Passo inicial')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cruz médica' })).toBeInTheDocument();
  });

  it('when cancelling the text editor, should leave the draft as it was', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await userEvent.click(textButton('Primeiro passo'));
    await userEvent.type(dialog().getByRole('textbox'), ' x');

    await userEvent.click(dialog().getByRole('button', { name: 'Cancelar' }));
    await gone();

    expect(screen.getByText('Primeiro passo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('when cancelling the edition after changing a text, should ask before throwing it away', async () => {
    saved.state = { isPending: false, data: infographic };
    renderTab();
    await startEditing();
    await userEvent.click(textButton('Primeiro passo'));
    await userEvent.type(dialog().getByRole('textbox'), ' x');
    await userEvent.click(dialog().getByRole('button', { name: 'Aplicar' }));
    await gone();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByText('Descartar as alterações?')).toBeInTheDocument();
    expect(screen.getByText(/As peças e os textos que você mudou/)).toBeInTheDocument();
  });

  it('when not editing, should not make any text clickable', () => {
    saved.state = { isPending: false, data: infographic };

    renderTab();

    expect(screen.queryAllByTitle('Editar este texto')).toHaveLength(0);
  });
});
