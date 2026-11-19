import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AppearanceContext, type AppearanceApi } from '#hooks/use-appearance';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';

const documentQuery = { data: undefined as unknown, isLoading: false, isError: false };
const idle = { mutate: vi.fn(), isPending: false, isError: false };

vi.mock('./hooks/useLibrary', () => ({
  useDocument: () => documentQuery,
  useArchiveDocument: () => idle,
  useCategories: () => ({ data: [] }),
  useUpdateDocument: () => idle,
}));
vi.mock('./books/hooks', () => ({
  useBooks: () => ({ data: [], isLoading: false }),
  useAddBookChapter: () => idle,
  useCreateBook: () => idle,
}));

import { DocumentPage } from './DocumentPage';

const body = '# Introdução\n\ntexto\n\n## Detalhes\n\nmais texto';

const detail = (type: string) => ({
  meta: {
    id: 'id1',
    title: 'Resumo de redes',
    type,
    source: 'video',
    sourceUrl: 'https://exemplo.com/v.mp4',
    status: 'published',
    category: ['DevOps'],
    tags: [],
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-06T10:00:00.000Z',
  },
  content: body,
});

const renderPage = (outline: boolean) => {
  const api: AppearanceApi = {
    appearance: { ...DEFAULT_APPEARANCE, summary: { outline } },
    update: vi.fn(),
    updateReading: vi.fn(),
    reset: vi.fn(),
    resetReading: vi.fn(),
    updateTranscript: vi.fn(),
    resetTranscript: vi.fn(),
    updateSummary: vi.fn(),
    resetSummary: vi.fn(),
  };

  return render(
    <AppearanceContext.Provider value={api}>
      <MemoryRouter initialEntries={['/library/id1']}>
        <Routes>
          <Route path="/library/:id" element={<DocumentPage />} />
        </Routes>
      </MemoryRouter>
    </AppearanceContext.Provider>,
  );
};

describe('DocumentPage — summary outline preference', () => {
  it('when a summary has the outline option on, should show the Sumário', () => {
    documentQuery.data = detail('summary');

    renderPage(true);

    expect(screen.getByRole('navigation', { name: 'Sumário' })).toBeInTheDocument();
  });

  it('when a summary has the outline option off, should hide the Sumário', () => {
    documentQuery.data = detail('summary');

    renderPage(false);

    expect(screen.queryByRole('navigation', { name: 'Sumário' })).not.toBeInTheDocument();
  });

  it('when the page is not a summary, should keep the Sumário even with the option off', () => {
    documentQuery.data = detail('article');

    renderPage(false);

    expect(screen.getByRole('navigation', { name: 'Sumário' })).toBeInTheDocument();
  });
});

vi.mock('./components/SummaryMindMap', () => ({
  SummaryMindMap: ({
    documentId,
    title,
    content,
  }: {
    documentId: string;
    title: string;
    content: string;
  }) => (
    <div data-testid="mind-map" data-title={title} data-id={documentId}>
      {content}
    </div>
  ),
}));

describe('DocumentPage — mind map view', () => {
  it('when the page is a summary, should offer Resumo and Mapa mental with the text selected', () => {
    documentQuery.data = detail('summary');

    renderPage(true);

    expect(screen.getByRole('button', { name: 'Resumo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Mapa mental' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByTestId('mind-map')).not.toBeInTheDocument();
  });

  it('when the user opens Mapa mental, should show the map of the summary instead of the text and hide the Sumário', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));

    expect(screen.getByTestId('mind-map')).toHaveAttribute('data-title', 'Resumo de redes');
    expect(screen.queryByRole('navigation', { name: 'Sumário' })).not.toBeInTheDocument();
  });

  it('when the user goes back to Resumo, should show the text again', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: 'Resumo' }));

    expect(screen.queryByTestId('mind-map')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Sumário' })).toBeInTheDocument();
  });

  it('when the page is not a summary, should not offer the mind map', () => {
    documentQuery.data = detail('transcription');

    renderPage(true);

    expect(screen.queryByRole('button', { name: 'Mapa mental' })).not.toBeInTheDocument();
  });
});

describe('DocumentPage — reading mode with the mind map', () => {
  const reading = () => screen.getByRole('region', { name: 'Modo leitura' });

  it('when reading a summary with the text open, should offer Resumo and Mapa mental and keep the text', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(within(reading()).getByRole('button', { name: 'Resumo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(reading()).getByRole('button', { name: 'Mapa mental' })).toBeInTheDocument();
    expect(screen.queryByTestId('mind-map')).not.toBeInTheDocument();
  });

  it('when the mind map is open and the user enters reading mode, should keep the mind map', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(within(reading()).getByTestId('mind-map')).toHaveAttribute(
      'data-title',
      'Resumo de redes',
    );
    expect(within(reading()).getByRole('button', { name: 'Mapa mental' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('when the user switches inside reading mode, should swap between the text and the map', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));
    await userEvent.click(within(reading()).getByRole('button', { name: 'Mapa mental' }));

    expect(within(reading()).getByTestId('mind-map')).toBeInTheDocument();

    await userEvent.click(within(reading()).getByRole('button', { name: 'Resumo' }));

    expect(screen.queryByTestId('mind-map')).not.toBeInTheDocument();
    expect(within(reading()).getByRole('heading', { name: 'Introdução' })).toBeInTheDocument();
  });

  it('when the user leaves reading mode, should keep the form chosen there', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));
    await userEvent.click(within(reading()).getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sair do modo leitura' }));

    expect(screen.queryByRole('region', { name: 'Modo leitura' })).not.toBeInTheDocument();
    expect(screen.getByTestId('mind-map')).toBeInTheDocument();
  });

  it('when reading a page that is not a summary, should not offer the mind map', async () => {
    documentQuery.data = detail('transcription');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(within(reading()).queryByRole('button', { name: 'Mapa mental' })).not.toBeInTheDocument();
  });
});

describe('DocumentPage — mind map takes the whole area', () => {
  const reading = () => screen.getByRole('region', { name: 'Modo leitura' });
  const sidebar = () => screen.queryByRole('complementary', { name: 'Informações da página' });

  it('when the mind map is open on the page, should fill the content area with a bordered canvas', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));

    const canvas = screen.getByTestId('mind-map').parentElement as HTMLElement;

    expect(canvas).toHaveClass('overflow-hidden', 'rounded-lg', 'border');
    expect(canvas.className).toMatch(/h-\[calc\(100svh-/);
  });

  it('when the mind map is open on the page, should drop the reading side panel and the Sumário', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);

    expect(sidebar()).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));

    expect(sidebar()).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Sumário' })).not.toBeInTheDocument();
    expect(screen.queryByText('Aa')).not.toBeInTheDocument();
  });

  it('when the mind map is open on the page, should keep Modo leitura and Sobre a página next to the tabs', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));

    expect(screen.getByRole('button', { name: 'Resumo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modo leitura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sobre a página/ })).toBeInTheDocument();
  });

  it('when the user clicks Modo leitura from the page map, should open reading mode with the map', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(within(reading()).getByTestId('mind-map')).toBeInTheDocument();
  });

  it('when the user clicks Sobre a página from the page map, should open the about window', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: /Sobre a página/ }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('when going back to the text on the page, should bring the side panel back', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: 'Resumo' }));

    expect(sidebar()).toBeInTheDocument();
    expect(screen.queryByTestId('mind-map')).not.toBeInTheDocument();
  });

  it('when reading the mind map, should use the whole area with no side panels', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(reading()).toHaveClass('overflow-hidden');
    expect(document.querySelector('[data-slot="reading-edge-right"]')).toBeNull();
    expect(document.querySelector('[data-slot="reading-edge-left"]')).toBeNull();
  });

  it('when reading the text, should keep the reading side panels', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(reading()).not.toHaveClass('overflow-hidden');
    expect(document.querySelector('[data-slot="reading-edge-right"]')).not.toBeNull();
  });

  it('when switching inside reading mode, should bring the side panels back only for the text', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));
    await userEvent.click(within(reading()).getByRole('button', { name: 'Mapa mental' }));

    expect(document.querySelector('[data-slot="reading-edge-right"]')).toBeNull();

    await userEvent.click(within(reading()).getByRole('button', { name: 'Resumo' }));

    expect(document.querySelector('[data-slot="reading-edge-right"]')).not.toBeNull();
  });
});

describe('DocumentPage — Modo leitura and Sobre a página on the top row', () => {
  const sidebar = () => screen.queryByRole('complementary', { name: 'Informações da página' });
  const topRow = () =>
    screen.getByRole('button', { name: 'Resumo' }).parentElement?.parentElement as HTMLElement;

  it('when a summary is open on the text, should show the two actions as icons next to the tabs', () => {
    documentQuery.data = detail('summary');

    renderPage(true);

    const row = topRow();

    expect(within(row).getByRole('button', { name: 'Mapa mental' })).toBeInTheDocument();
    for (const name of ['Modo leitura', 'Sobre a página']) {
      const button = within(row).getByRole('button', { name });

      expect(button).toHaveTextContent('');
    }
  });

  it('when a summary is open on the text, should keep only the reading adjustments in the side panel', () => {
    documentQuery.data = detail('summary');

    renderPage(true);

    expect(sidebar()).toBeInTheDocument();
    expect(within(sidebar() as HTMLElement).queryByRole('button', { name: /Modo leitura/ })).toBeNull();
    expect(within(sidebar() as HTMLElement).queryByRole('button', { name: /Sobre a página/ })).toBeNull();
  });

  it('when a transcription is open, should show the same two icons on the Voltar row and no tabs', () => {
    documentQuery.data = detail('transcription');

    renderPage(true);

    const back = screen.getByRole('button', { name: /Voltar/ }).parentElement as HTMLElement;

    expect(within(back).getByRole('button', { name: 'Modo leitura' })).toHaveTextContent('');
    expect(within(back).getByRole('button', { name: 'Sobre a página' })).toHaveTextContent('');
    expect(screen.queryByRole('button', { name: 'Mapa mental' })).not.toBeInTheDocument();
    expect(within(sidebar() as HTMLElement).queryByRole('button', { name: /Modo leitura/ })).toBeNull();
  });

  it('when an article is open, should show the same two icons on the Voltar row', () => {
    documentQuery.data = detail('article');

    renderPage(true);

    const back = screen.getByRole('button', { name: /Voltar/ }).parentElement as HTMLElement;

    expect(within(back).getByRole('button', { name: 'Modo leitura' })).toBeInTheDocument();
    expect(within(back).getByRole('button', { name: 'Sobre a página' })).toBeInTheDocument();
  });

  it('when a summary is open, should not repeat the actions on the Voltar row', () => {
    documentQuery.data = detail('summary');

    renderPage(true);

    const back = screen.getByRole('button', { name: /Voltar/ }).parentElement as HTMLElement;

    expect(within(back).queryByRole('button', { name: 'Modo leitura' })).toBeNull();
  });

  it('when the user clicks Modo leitura on a transcription, should open reading mode', async () => {
    documentQuery.data = detail('transcription');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(screen.getByRole('region', { name: 'Modo leitura' })).toBeInTheDocument();
  });

  it('when the user clicks Sobre a página on a transcription, should open the about window', async () => {
    documentQuery.data = detail('transcription');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Sobre a página' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('when the mouse goes over the icons, should show tooltips with the actions', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.hover(screen.getByRole('button', { name: 'Modo leitura' }));

    expect(
      await screen.findByText('Modo leitura', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it('when the mind map is open, should keep the same two icons next to the tabs', async () => {
    documentQuery.data = detail('summary');

    renderPage(true);
    await userEvent.click(screen.getByRole('button', { name: 'Mapa mental' }));

    expect(screen.getByRole('button', { name: 'Modo leitura' })).toHaveTextContent('');
    expect(screen.getByRole('button', { name: 'Sobre a página' })).toHaveTextContent('');
  });
});
