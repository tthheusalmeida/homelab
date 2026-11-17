import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppLayout } from './layouts/AppLayout';

// A Início abre junto com o app; as demais telas são carregadas sob demanda (cada uma vira um
// arquivo separado), então o app abre lendo bem menos código. O roteador espera a tela carregar
// antes de trocar, sem piscar, e `preloadRoutes` já as busca em segundo plano depois da abertura.
import { HomePage } from '../pages/home/HomePage';

type Loader = () => Promise<Record<string, unknown>>;

/** Rota carregada sob demanda: o roteador espera o arquivo e usa o componente exportado com `name`. */
const lazyRoute = (load: Loader, name: string) => ({
  lazy: async () => ({ Component: (await load())[name] as ComponentType }),
});

const loaders = {
  chat: () => import('../pages/ai/chat/ChatPage'),
  usage: () => import('../pages/ai/usage/UsagePage'),
  libraryLayout: () => import('../pages/library/LibraryLayout'),
  library: () => import('../pages/library/LibraryPage'),
  inbox: () => import('../pages/library/InboxPage'),
  newArticle: () => import('../pages/library/NewArticlePage'),
  document: () => import('../pages/library/DocumentPage'),
  editDocument: () => import('../pages/library/EditDocumentPage'),
  books: () => import('../pages/library/books/BooksPage'),
  book: () => import('../pages/library/books/BookPage'),
  createJob: () => import('../pages/jobs/create/CreatePage'),
  trackJobs: () => import('../pages/jobs/track/TrackPage'),
  settings: () => import('../pages/settings/SettingsPage'),
} satisfies Record<string, Loader>;

export interface PreloadOptions {
  /** O que baixar, em ordem (padrão: todas as telas sob demanda). */
  load?: Loader[];
  /** Agenda a próxima etapa para quando o app estiver ocioso. */
  schedule?: (run: () => void) => number;
  cancel?: (handle: number) => void;
}

const idleSchedule = (run: () => void): number =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(run, { timeout: 3_000 })
    : window.setTimeout(run, 500);

const idleCancel = (handle: number): void => {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
};

/**
 * Baixa as telas que faltam em segundo plano, uma por vez e só quando o app está ocioso (não
 * atrapalha a abertura nem o uso), para que abrir qualquer uma seja imediato. Devolve quem cancela.
 */
export function preloadRoutes({
  load = Object.values(loaders),
  schedule = idleSchedule,
  cancel = idleCancel,
}: PreloadOptions = {}): () => void {
  const pending = [...load];
  let handle = 0;
  let stopped = false;

  const next = () => {
    const loader = pending.shift();

    if (stopped || !loader) {
      return;
    }

    // Falha ao carregar não derruba nada: a tela tenta de novo quando for aberta.
    void loader()
      .catch(() => undefined)
      .then(() => {
        if (!stopped) {
          handle = schedule(next);
        }
      });
  };

  handle = schedule(next);

  return () => {
    stopped = true;
    cancel(handle);
  };
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    // Só aparece se o app abrir já numa tela de carregamento sob demanda (ex.: recarregar nela).
    HydrateFallback: () => null,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'library',
        ...lazyRoute(loaders.libraryLayout, 'LibraryLayout'),
        children: [
          { index: true, ...lazyRoute(loaders.library, 'LibraryPage') },
          { path: 'inbox', ...lazyRoute(loaders.inbox, 'InboxPage') },
          { path: 'new', ...lazyRoute(loaders.newArticle, 'NewArticlePage') },
          { path: 'books', ...lazyRoute(loaders.books, 'BooksPage') },
          { path: 'books/:bookId', ...lazyRoute(loaders.book, 'BookPage') },
          { path: ':id', ...lazyRoute(loaders.document, 'DocumentPage') },
          { path: ':id/edit', ...lazyRoute(loaders.editDocument, 'EditDocumentPage') },
        ],
      },
      {
        path: 'ai',
        children: [
          { path: 'chat', ...lazyRoute(loaders.chat, 'ChatPage') },
          { path: 'usage', ...lazyRoute(loaders.usage, 'UsagePage') },
        ],
      },
      { path: 'settings', ...lazyRoute(loaders.settings, 'SettingsPage') },
      {
        path: 'jobs',
        children: [
          { path: 'create', ...lazyRoute(loaders.createJob, 'CreatePage') },
          { path: 'track', ...lazyRoute(loaders.trackJobs, 'TrackPage') },
        ],
      },
    ],
  },
]);
