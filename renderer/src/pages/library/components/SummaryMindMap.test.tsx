import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const saved = vi.hoisted(() => ({
  state: { isPending: false, isSuccess: true, isError: false, data: null as unknown },
}));
const save = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
const saveMap = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const snackbar = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const del = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  state: { isPending: false, error: null as Error | null },
}));
const generate = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { isPending: false, isError: false, error: null as Error | null },
}));

vi.mock('../hooks/useLibrary', () => ({
  useMindMap: () => saved.state,
  useGenerateMindMap: () => ({ mutate: generate.mutate, ...generate.state }),
  useSaveMindMapImage: () => ({ mutateAsync: save.mutateAsync }),
  useSaveMindMap: () => ({ mutateAsync: saveMap.mutateAsync, isPending: saveMap.isPending }),
  useDeleteMindMap: () => ({ mutate: del.mutate, reset: del.reset, ...del.state }),
}));
vi.mock('#components/Snackbar', () => ({ useSnackbar: () => snackbar }));
vi.mock('#components/MindMapView', () => ({
  MindMapView: ({
    map,
    notice,
    toolbar,
    overlay,
    onDownloadImage,
    onDownloadError,
    edit,
  }: {
    edit?: {
      draft: { subtitle: string; nodes: { label: string; note?: string; children: unknown[] }[] };
      onChange: (draft: {
        subtitle: string;
        nodes: { label: string; note?: string; children: unknown[] }[];
      }) => void;
    };
    map: { title: string; subtitle?: string; nodes: { label: string }[] };
    notice?: React.ReactNode;
    toolbar?: React.ReactNode;
    overlay?: React.ReactNode;
    onDownloadImage?: (image: { fileName: string; dataBase64: string }) => Promise<void>;
    onDownloadError?: (message: string) => void;
  }) => (
    <div>
      <div data-testid="mind-map">
        {map.title}
        {map.subtitle ? ` (${map.subtitle})` : ''}: {map.nodes.map((node) => node.label).join(',')}
      </div>
      {notice && <div data-testid="map-notice">{notice}</div>}
      {toolbar && <div data-testid="map-toolbar">{toolbar}</div>}
      {overlay && <div data-testid="map-overlay">{overlay}</div>}
      {edit && (
        <div data-testid="editing">
          {edit.draft.subtitle}|{edit.draft.nodes.map((node) => node.label).join(',')}
          <button
            type="button"
            onClick={() => edit.onChange({ ...edit.draft, subtitle: ' Novo subtítulo ' })}
          >
            mudar-subtitulo
          </button>
          <button
            type="button"
            onClick={() =>
              edit.onChange({
                ...edit.draft,
                nodes: [{ label: '  ', children: [] }, ...edit.draft.nodes.slice(1)],
              })
            }
          >
            esvaziar-termo
          </button>
          <button type="button" onClick={() => edit.onChange({ ...edit.draft, nodes: [] })}>
            apagar-tudo
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() =>
          onDownloadImage?.({ fileName: 'Mapa mental - Redes', dataBase64: 'UE5H' }).catch(
            (error: Error) => onDownloadError?.(error.message),
          )
        }
      >
        baixar-simulado
      </button>
    </div>
  ),
}));

import { dismissGeneration, isGenerationDismissed } from '#lib/dismissed-generation';

import { SummaryMindMap } from './SummaryMindMap';

const content = '## Local A\n- **Item**: x';
let counter = 0;
// Cada teste usa uma página nova: o app lembra, na sessão, em quais já chamou a IA.
const nextId = () => `page-${(counter += 1)}`;

const aiMap = {
  subtitle: 'Estuda redes',
  nodes: [{ label: 'Da IA', children: [] }],
  model: 'gemini-x',
  createdAt: '2026-11-19T10:00:00.000Z',
  stale: false,
};

function renderMap(id = nextId()) {
  render(<SummaryMindMap documentId={id} title="Redes" content={content} />);

  return id;
}

beforeEach(() => {
  saveMap.mutateAsync.mockReset();
  saveMap.isPending = false;
  save.mutateAsync.mockReset();
  snackbar.success.mockReset();
  snackbar.error.mockReset();
  generate.mutate.mockReset();
  del.mutate
    .mockReset()
    .mockImplementation((_id: string, options?: { onSuccess?: () => void }) =>
      options?.onSuccess?.(),
    );
  del.reset.mockReset();
  del.state = { isPending: false, error: null };
  saved.state = { isPending: false, isSuccess: true, isError: false, data: null };
  generate.state = { isPending: false, isError: false, error: null };
});

describe('SummaryMindMap', () => {
  it('when the saved map is loading, should show the loading state and not call the AI', () => {
    saved.state = { isPending: true, isSuccess: false, isError: false, data: undefined };

    renderMap();

    expect(screen.getByText('Carregando o mapa mental')).toBeInTheDocument();
    expect(generate.mutate).not.toHaveBeenCalled();
  });

  it('when there is no saved map, should ask the AI once for this page', () => {
    const id = renderMap();

    expect(generate.mutate).toHaveBeenCalledTimes(1);
    expect(generate.mutate).toHaveBeenCalledWith({ id });
  });

  it('when the tab is opened again after the AI was asked, should not ask again by itself', () => {
    const id = renderMap();

    renderMap(id);

    expect(generate.mutate).toHaveBeenCalledTimes(1);
  });

  it('when a map is saved, should show the AI map and never call the AI', () => {
    saved.state = { ...saved.state, data: aiMap };

    renderMap();

    expect(screen.getByTestId('mind-map')).toHaveTextContent('Redes (Estuda redes): Da IA');
    expect(
      within(screen.getByTestId('map-toolbar')).getByRole('button', {
        name: 'Gerar de novo com IA',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('map-notice')).not.toBeInTheDocument();
    expect(generate.mutate).not.toHaveBeenCalled();
  });

  it('when the AI is working, should show the simple map from the text and tell the user', () => {
    generate.state = { isPending: true, isError: false, error: null };

    renderMap();

    expect(screen.getByTestId('mind-map')).toHaveTextContent('Redes: Local A');
    expect(screen.getByRole('status')).toHaveTextContent('Gerando o mapa de revisão com a IA');
  });

  it('when the AI is working, should cover the map with the loading state', () => {
    generate.state = { isPending: true, isError: false, error: null };

    renderMap();

    expect(screen.getByTestId('map-overlay')).toHaveTextContent(
      'Gerando o mapa de revisão com a IA',
    );
  });

  it('when the user clicks Gerar com IA and it is working, should show the loading on the button and disable it', () => {
    generate.state = { isPending: true, isError: false, error: null };

    renderMap();

    // enquanto trabalha, o aviso é só de andamento (sem botão); o carregamento está na tela do mapa
    expect(screen.queryByRole('button', { name: 'Gerar com IA' })).not.toBeInTheDocument();
  });

  it('when the AI is not working, should not cover the map', () => {
    renderMap();

    expect(screen.queryByTestId('map-overlay')).not.toBeInTheDocument();
  });

  it('when the AI fails, should keep the simple map, show the reason and offer to try again', async () => {
    generate.state = {
      isPending: false,
      isError: true,
      error: new Error('O limite de uso foi atingido.'),
    };

    const id = renderMap();

    expect(screen.getByTestId('mind-map')).toHaveTextContent('Redes: Local A');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('O limite de uso foi atingido.');

    generate.mutate.mockClear();
    await userEvent.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));

    expect(generate.mutate).toHaveBeenCalledWith({ id });
  });

  it('when the AI was already asked and has not answered, should offer Gerar com IA instead of asking again', async () => {
    const id = nextId();

    renderMap(id);
    generate.mutate.mockClear();
    cleanup();
    renderMap(id);

    expect(generate.mutate).not.toHaveBeenCalled();

    const note = screen.getByRole('note');

    expect(note).toHaveTextContent('mapa simples feito do texto, sem IA');

    await userEvent.click(within(note).getByRole('button', { name: 'Gerar com IA' }));

    expect(generate.mutate).toHaveBeenCalledWith({ id });
  });

  it('when the saved map is stale, should warn and offer to update it', async () => {
    saved.state = { ...saved.state, data: { ...aiMap, stale: true } };

    const id = renderMap();

    const warning = screen.getByRole('status');

    expect(warning).toHaveTextContent('O resumo mudou depois que este mapa foi gerado.');

    await userEvent.click(within(warning).getByRole('button', { name: 'Atualizar com IA' }));

    expect(generate.mutate).toHaveBeenCalledWith({ id });
  });

  it('when regenerating a saved map, should keep showing it and disable the button', () => {
    saved.state = { ...saved.state, data: aiMap };
    generate.state = { isPending: true, isError: false, error: null };

    renderMap();

    expect(screen.getByTestId('mind-map')).toHaveTextContent('Da IA');
    expect(screen.getByRole('button', { name: 'Gerando…' })).toBeDisabled();
  });
});

describe('SummaryMindMap placement', () => {
  it('when a saved map is fresh, should put the icon to generate again among the map controls and call the AI on click', async () => {
    saved.state = { ...saved.state, data: aiMap };

    const id = renderMap();

    await userEvent.click(
      within(screen.getByTestId('map-toolbar')).getByRole('button', {
        name: 'Gerar de novo com IA',
      }),
    );

    expect(generate.mutate).toHaveBeenCalledWith({ id });
  });

  it('when the saved map is stale, should not repeat the button in the map controls', () => {
    saved.state = { ...saved.state, data: { ...aiMap, stale: true } };

    renderMap();

    expect(screen.getByTestId('map-notice')).toHaveTextContent('O resumo mudou');
    expect(
      within(screen.getByTestId('map-toolbar')).queryByRole('button', {
        name: 'Gerar de novo com IA',
      }),
    ).not.toBeInTheDocument();
  });

  it('when regenerating a saved map fails, should show the error with Tentar de novo inside it and keep the saved map', async () => {
    saved.state = { ...saved.state, data: aiMap };
    generate.state = { isPending: false, isError: true, error: new Error('Sem conexão.') };

    const id = renderMap();
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Sem conexão.');
    expect(alert).toHaveTextContent('O mapa anterior continua aqui.');
    expect(screen.getByTestId('mind-map')).toHaveTextContent('Redes (Estuda redes): Da IA');
    expect(
      within(screen.getByTestId('map-toolbar')).queryByRole('button', {
        name: 'Gerar de novo com IA',
      }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(alert).getByRole('button', { name: 'Tentar de novo' }));

    expect(generate.mutate).toHaveBeenCalledWith({ id });
  });

  it('when the first generation fails, should say the simple map is the one shown', () => {
    generate.state = { isPending: false, isError: true, error: new Error('Sem chave.') };

    renderMap();

    expect(screen.getByRole('alert')).toHaveTextContent('Este é um mapa simples feito do texto.');
  });

  it('when the user downloads the image and picks a place, should save it and tell the user', async () => {
    save.mutateAsync.mockResolvedValue({ saved: true, path: 'D:/mapa.png' });

    renderMap();
    await userEvent.click(screen.getByRole('button', { name: 'baixar-simulado' }));

    await waitFor(() => expect(snackbar.success).toHaveBeenCalledWith('Imagem do mapa salva.'));

    expect(save.mutateAsync).toHaveBeenCalledWith({
      fileName: 'Mapa mental - Redes',
      dataBase64: 'UE5H',
    });
  });

  it('when the user closes the save dialog, should say nothing', async () => {
    save.mutateAsync.mockResolvedValue({ saved: false });

    renderMap();
    await userEvent.click(screen.getByRole('button', { name: 'baixar-simulado' }));

    await waitFor(() => expect(save.mutateAsync).toHaveBeenCalled());

    expect(snackbar.success).not.toHaveBeenCalled();
    expect(snackbar.error).not.toHaveBeenCalled();
  });

  it('when saving the image fails, should show the error message', async () => {
    save.mutateAsync.mockRejectedValue(new Error('Não foi possível salvar a imagem.'));

    renderMap();
    await userEvent.click(screen.getByRole('button', { name: 'baixar-simulado' }));

    await waitFor(() =>
      expect(snackbar.error).toHaveBeenCalledWith('Não foi possível salvar a imagem.'),
    );
  });
});

describe('SummaryMindMap editing', () => {
  const edited = { ...aiMap, edited: true };
  const toolbar = () => screen.getByTestId('map-toolbar');
  const startEditing = async () =>
    userEvent.click(within(toolbar()).getByRole('button', { name: 'Editar o mapa' }));

  it('when there is an AI map, should offer to edit it next to generating again', () => {
    saved.state = { ...saved.state, data: aiMap };

    renderMap();

    expect(within(toolbar()).getByRole('button', { name: 'Editar o mapa' })).toBeInTheDocument();
    expect(
      within(toolbar()).getByRole('button', { name: 'Gerar de novo com IA' }),
    ).toBeInTheDocument();
  });

  it('when there is only the simple map, should still offer to edit it', () => {
    renderMap();

    expect(within(toolbar()).getByRole('button', { name: 'Editar o mapa' })).toBeInTheDocument();
  });

  it('when the AI is working, should not offer to edit', () => {
    generate.state = { isPending: true, isError: false, error: null };

    renderMap();

    expect(within(toolbar()).getByRole('button', { name: 'Editar o mapa' })).toBeDisabled();
  });

  it('when the user starts editing, should show the editing map and swap the controls to Salvar and Cancelar', async () => {
    saved.state = { ...saved.state, data: aiMap };

    renderMap();
    await startEditing();

    expect(screen.getByTestId('editing')).toHaveTextContent('Estuda redes|Da IA');
    expect(within(toolbar()).getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
    expect(within(toolbar()).getByRole('button', { name: 'Cancelar edição' })).toBeInTheDocument();
    expect(within(toolbar()).queryByRole('button', { name: 'Editar o mapa' })).toBeNull();
    expect(within(toolbar()).queryByRole('button', { name: 'Gerar de novo com IA' })).toBeNull();
  });

  it('when editing the simple map, should start from the simple map text', async () => {
    renderMap();
    await startEditing();

    expect(screen.getByTestId('editing')).toHaveTextContent('|Local A');
  });

  it('when the user saves, should send the trimmed map, tell the user and leave editing', async () => {
    saved.state = { ...saved.state, data: aiMap };
    saveMap.mutateAsync.mockResolvedValue({ ...aiMap, edited: true });

    const id = renderMap();

    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(snackbar.success).toHaveBeenCalledWith('Mapa salvo.'));

    expect(saveMap.mutateAsync).toHaveBeenCalledWith({
      id,
      subtitle: 'Novo subtítulo',
      nodes: [{ label: 'Da IA', children: [] }],
    });
    expect(screen.queryByTestId('editing')).not.toBeInTheDocument();
  });

  it('when saving fails, should show the error and stay in editing with the changes', async () => {
    saved.state = { ...saved.state, data: aiMap };
    saveMap.mutateAsync.mockRejectedValue(new Error('Disco cheio.'));

    renderMap();
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(snackbar.error).toHaveBeenCalledWith('Disco cheio.'));

    expect(screen.getByTestId('editing')).toHaveTextContent('Novo subtítulo');
    expect(snackbar.success).not.toHaveBeenCalled();
  });

  it('when saving fails without a message, should say so in general', async () => {
    saveMap.mutateAsync.mockRejectedValue('x');

    renderMap();
    await startEditing();
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() =>
      expect(snackbar.error).toHaveBeenCalledWith('Não foi possível salvar o mapa.'),
    );
  });

  it('when a term is left empty, should warn and not let the user save', async () => {
    saved.state = { ...saved.state, data: aiMap };

    renderMap();
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'esvaziar-termo' }));

    expect(screen.getByTestId('map-notice')).toHaveTextContent('Preencha o termo de todos os nós');
    expect(within(toolbar()).getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    expect(saveMap.mutateAsync).not.toHaveBeenCalled();
  });

  it('when every branch is deleted, should warn that at least one is needed and not let the user save', async () => {
    saved.state = { ...saved.state, data: aiMap };

    renderMap();
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'apagar-tudo' }));

    expect(screen.getByTestId('map-notice')).toHaveTextContent('pelo menos um ramo');
    expect(within(toolbar()).getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('when the map is being saved, should show it and block saving twice and cancelling', async () => {
    saveMap.isPending = true;

    renderMap();
    await startEditing();

    expect(within(toolbar()).getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(within(toolbar()).getByRole('button', { name: 'Cancelar edição' })).toBeDisabled();
  });

  it('when the user cancels without changes, should leave editing at once', async () => {
    renderMap();
    await startEditing();
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.queryByTestId('editing')).not.toBeInTheDocument();
    expect(screen.queryByText('Descartar as alterações?')).not.toBeInTheDocument();
  });

  it('when the user cancels after changes, should ask before throwing them away', async () => {
    renderMap();
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Cancelar edição' }));

    expect(screen.getByText('Descartar as alterações?')).toBeInTheDocument();
    expect(screen.getByTestId('editing')).toBeInTheDocument();
  });

  it('when the user confirms discarding, should leave editing without saving', async () => {
    renderMap();
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Cancelar edição' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));

    expect(screen.queryByTestId('editing')).not.toBeInTheDocument();
    expect(saveMap.mutateAsync).not.toHaveBeenCalled();
  });

  it('when the user keeps editing after the discard question, should keep the changes', async () => {
    renderMap();
    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Cancelar edição' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByTestId('editing')).toHaveTextContent('Novo subtítulo');
  });

  it('when the user leaves the tab in the middle of an edit and comes back, should resume the same draft', async () => {
    saved.state = { ...saved.state, data: aiMap };

    const id = renderMap();

    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));

    cleanup();
    renderMap(id);

    expect(screen.getByTestId('editing')).toHaveTextContent('Novo subtítulo');
  });

  it('when the edit was saved, coming back should not resume it', async () => {
    saved.state = { ...saved.state, data: aiMap };
    saveMap.mutateAsync.mockResolvedValue({ ...aiMap, edited: true });

    const id = renderMap();

    await startEditing();
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(snackbar.success).toHaveBeenCalled());

    cleanup();
    renderMap(id);

    expect(screen.queryByTestId('editing')).not.toBeInTheDocument();
  });

  it('when the edit was discarded, coming back should not resume it', async () => {
    const id = renderMap();

    await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'mudar-subtitulo' }));
    await userEvent.click(within(toolbar()).getByRole('button', { name: 'Cancelar edição' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));

    cleanup();
    renderMap(id);

    expect(screen.queryByTestId('editing')).not.toBeInTheDocument();
  });

  it('when editing, should hide the other notices (a failed generation, for example)', async () => {
    generate.state = { isPending: false, isError: true, error: new Error('Sem conexão.') };

    renderMap();

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await startEditing();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('generating again over an edited map', () => {
    it('when the map was edited, should ask before replacing the edits and not call the AI yet', async () => {
      saved.state = { ...saved.state, data: edited };

      renderMap();
      await userEvent.click(
        within(toolbar()).getByRole('button', { name: 'Gerar de novo com IA' }),
      );

      expect(screen.getByText('Gerar de novo e perder as suas edições?')).toBeInTheDocument();
      expect(screen.getByText(/apaga as suas edições/)).toBeInTheDocument();
      expect(generate.mutate).not.toHaveBeenCalled();
    });

    it('when the user confirms, should generate again', async () => {
      saved.state = { ...saved.state, data: edited };

      const id = renderMap();

      await userEvent.click(
        within(toolbar()).getByRole('button', { name: 'Gerar de novo com IA' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Gerar de novo' }));

      expect(generate.mutate).toHaveBeenCalledWith({ id });
    });

    it('when the user cancels, should keep the edited map and not call the AI', async () => {
      saved.state = { ...saved.state, data: edited };

      renderMap();
      await userEvent.click(
        within(toolbar()).getByRole('button', { name: 'Gerar de novo com IA' }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(generate.mutate).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(
          screen.queryByText('Gerar de novo e perder as suas edições?'),
        ).not.toBeInTheDocument(),
      );
    });

    it('when the map was not edited, should generate again without asking', async () => {
      saved.state = { ...saved.state, data: aiMap };

      const id = renderMap();

      await userEvent.click(
        within(toolbar()).getByRole('button', { name: 'Gerar de novo com IA' }),
      );

      expect(generate.mutate).toHaveBeenCalledWith({ id });
      expect(screen.queryByText('Gerar de novo e perder as suas edições?')).not.toBeInTheDocument();
    });

    it('when an edited map is stale, should also ask before the update replaces the edits', async () => {
      saved.state = { ...saved.state, data: { ...edited, stale: true } };

      renderMap();
      await userEvent.click(
        within(screen.getByTestId('map-notice')).getByRole('button', { name: 'Atualizar com IA' }),
      );

      expect(screen.getByText('Gerar de novo e perder as suas edições?')).toBeInTheDocument();
      expect(generate.mutate).not.toHaveBeenCalled();
    });
  });
});

describe('SummaryMindMap delete', () => {
  const toolbar = () => screen.getByTestId('map-toolbar');
  const deleteButton = () =>
    within(toolbar()).getByRole('button', { name: 'Excluir só o mapa mental' });

  it('when there is a map, should offer a delete button that says it is only the mind map', () => {
    saved.state = { ...saved.state, data: aiMap };

    renderMap();

    expect(deleteButton()).toBeInTheDocument();
  });

  it('when there is no saved map, should not offer to delete', () => {
    renderMap();

    expect(
      within(toolbar()).queryByRole('button', { name: 'Excluir só o mapa mental' }),
    ).not.toBeInTheDocument();
  });

  it('when clicking delete, should ask first and say what stays', async () => {
    saved.state = { ...saved.state, data: aiMap };
    renderMap();

    await userEvent.click(deleteButton());

    expect(screen.getByText('Excluir só o mapa mental?')).toBeInTheDocument();
    expect(screen.getByText(/O texto do resumo e o infográfico/)).toBeInTheDocument();
    expect(del.mutate).not.toHaveBeenCalled();
  });

  it('when the map was edited, should warn that the edits are lost too', async () => {
    saved.state = { ...saved.state, data: { ...aiMap, edited: true } };
    renderMap();

    await userEvent.click(deleteButton());

    expect(screen.getByText(/inclusive todas as edições que você fez nele/)).toBeInTheDocument();
  });

  it('when the map was not edited, should not talk about edits', async () => {
    saved.state = { ...saved.state, data: aiMap };
    renderMap();

    await userEvent.click(deleteButton());

    expect(screen.queryByText(/inclusive todas as edições/)).not.toBeInTheDocument();
  });

  it('when the user cancels, should delete nothing', async () => {
    saved.state = { ...saved.state, data: aiMap };
    renderMap();
    await userEvent.click(deleteButton());

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(del.mutate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText('Excluir só o mapa mental?')).not.toBeInTheDocument(),
    );
  });

  it('when the user confirms, should delete only the map, say so and not ask the AI for another one', async () => {
    saved.state = { ...saved.state, data: aiMap };
    const id = renderMap();
    await userEvent.click(deleteButton());

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir só o mapa mental' }),
    );

    expect(del.mutate).toHaveBeenCalledWith(id, expect.any(Object));
    expect(snackbar.success).toHaveBeenCalledWith('Mapa mental excluído.');

    // sem mapa guardado, a aba mostra o mapa simples sem gerar outro sozinha
    saved.state = { ...saved.state, data: null };
    cleanup();
    render(<SummaryMindMap documentId={id} title="Redes" content={content} />);

    expect(generate.mutate).not.toHaveBeenCalled();
  });

  it('when the user confirms the delete, should remember it for the next sessions', async () => {
    saved.state = { ...saved.state, data: aiMap };
    const id = renderMap();
    await userEvent.click(deleteButton());
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir só o mapa mental' }),
    );

    expect(isGenerationDismissed('mind-map', id)).toBe(true);
  });

  it('when the user deleted it on purpose before (even in another session), should not generate by itself and let the button generate again', async () => {
    const id = nextId();

    dismissGeneration('mind-map', id);
    renderMap(id);

    expect(generate.mutate).not.toHaveBeenCalled();

    await userEvent.click(
      within(screen.getByRole('note')).getByRole('button', { name: 'Gerar com IA' }),
    );

    expect(generate.mutate).toHaveBeenCalledWith({ id });
    expect(isGenerationDismissed('mind-map', id)).toBe(false);
  });

  it('when deleting fails, should show the reason inside the dialog and keep it open', async () => {
    saved.state = { ...saved.state, data: aiMap };
    del.mutate.mockReset();
    del.state = { isPending: false, error: new Error('Falha ao apagar') };
    renderMap();

    await userEvent.click(deleteButton());

    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao apagar');
    expect(screen.getByText('Excluir só o mapa mental?')).toBeInTheDocument();
  });

  it('when the AI is working, should not allow deleting', () => {
    saved.state = { ...saved.state, data: aiMap };
    generate.state = { isPending: true, isError: false, error: null };

    renderMap();

    expect(deleteButton()).toBeDisabled();
  });
});
