import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
