import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';

import { createTestQueryClient } from '../test/utils';

import { SidebarProvider } from '#ui/sidebar';

import { IpcChannels } from '#shared/channels';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { COLLAPSED_GROUPS_KEY } from '#hooks/use-collapsed-groups';

import { AppSidebar, findActiveUrl } from './AppSidebar';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderSidebar = (path = '/') =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <SidebarProvider>
          <AppSidebar />
          <Where />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('AppSidebar', () => {
  it('when rendered, should show the sections and items in Portuguese', () => {
    mockApi({});

    renderSidebar();

    for (const label of ['HomeLab', 'IA', 'Biblioteca', 'Tarefas']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const item of [
      'Início',
      'Conversa',
      'Consumo',
      'Páginas',
      'Livros',
      'Caixa de entrada',
      'Nova página',
      'Nova tarefa',
      'Em andamento',
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('when rendered, should list the sections in the order HomeLab, Biblioteca, Tarefas and IA (IA last)', () => {
    mockApi({});

    renderSidebar();

    const order = ['HomeLab', 'Biblioteca', 'Tarefas', 'IA'].map((label) =>
      screen.getByText(label),
    );

    order.slice(1).forEach((element, index) => {
      expect(
        order[index].compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  it.each([
    ['/', 'Início'],
    ['/ai/chat', 'Conversa'],
    ['/ai/usage', 'Consumo'],
    ['/library', 'Páginas'],
    ['/library/books/abc', 'Livros'],
    ['/library/inbox', 'Caixa de entrada'],
    ['/library/new', 'Nova página'],
    ['/jobs/create', 'Nova tarefa'],
    ['/jobs/track', 'Em andamento'],
  ])('when the route is %s, should mark only %s as the current item', (path, label) => {
    mockApi({});

    renderSidebar(path);

    const current = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('data-active') !== null);

    expect(current.map((button) => button.textContent)).toEqual([label]);
  });

  it('when an original item is clicked, should still navigate to its route', async () => {
    const user = userEvent.setup();
    mockApi({});

    renderSidebar();
    await user.click(screen.getByText('Livros'));

    expect(screen.getByTestId('where')).toHaveTextContent('/library/books');
  });

  it('when rendered, should show Configurações in the footer, after the navigation', () => {
    mockApi({});

    renderSidebar();

    const footerItem = screen.getByText('Configurações');
    const lastNavItem = screen.getByText('Em andamento');

    expect(
      lastNavItem.compareDocumentPosition(footerItem) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('when Configurações is clicked, should ask the app to open the settings window without navigating', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({ [IpcChannels.app.openSettings]: () => ok(undefined) });

    renderSidebar();
    await user.click(screen.getByText('Configurações'));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.app.openSettings)).toHaveLength(1));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });
});

describe('AppSidebar: contador da caixa de entrada', () => {
  const page = (id: string) => ({ id, title: `Página ${id}`, status: 'pending' });

  it('when there are pages waiting, should show how many next to Caixa de entrada', async () => {
    mockApi({ [IpcChannels.library.inbox]: () => ok([page('1'), page('2'), page('3')]) });

    renderSidebar();

    const badge = await screen.findByLabelText('3 na caixa de entrada');

    expect(badge).toHaveTextContent('3');
    expect(badge.closest('li')).toHaveTextContent('Caixa de entrada');
  });

  it('when the inbox is empty, should show no counter', async () => {
    const invoke = mockApi({ [IpcChannels.library.inbox]: () => ok([]) });

    renderSidebar();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.library.inbox));

    expect(screen.queryByLabelText(/na caixa de entrada$/)).not.toBeInTheDocument();
  });

  it('when the inbox cannot be loaded, should still render the menu without a counter', () => {
    mockApi({});

    renderSidebar();

    expect(screen.getByText('Caixa de entrada')).toBeInTheDocument();
    expect(screen.queryByLabelText(/na caixa de entrada$/)).not.toBeInTheDocument();
  });

  it('when pages wait and jobs run, should keep each counter on its own item', async () => {
    mockApi({
      [IpcChannels.library.inbox]: () => ok([page('1')]),
      [IpcChannels.jobs.list]: () =>
        ok([
          {
            id: 'j',
            name: 'video-to-transcript',
            label: 'x',
            status: 'running',
            createdAt: '2026-01-01T10:00:00.000Z',
            completedAt: '',
            steps: [],
          },
        ]),
    });

    renderSidebar();

    expect((await screen.findByLabelText('1 na caixa de entrada')).closest('li')).toHaveTextContent(
      'Caixa de entrada',
    );
    expect((await screen.findByLabelText('1 em andamento')).closest('li')).toHaveTextContent(
      'Em andamento',
    );
  });
});

describe('AppSidebar: contador de jobs em andamento', () => {
  const job = (id: string, status: string) => ({
    id,
    name: 'video-to-transcript',
    label: 'Transcrição de vídeo',
    status,
    createdAt: '2026-01-01T10:00:00.000Z',
    completedAt: '',
    steps: [],
  });

  const withJobs = (jobs: unknown[]) => mockApi({ [IpcChannels.jobs.list]: () => ok(jobs) });

  it('when jobs are pending or running, should count only those next to the menu item', async () => {
    withJobs([
      job('1', 'running'),
      job('2', 'pending'),
      job('3', 'completed'),
      job('4', 'failed'),
    ]);

    renderSidebar();

    const badge = await screen.findByLabelText('2 em andamento');

    expect(badge).toHaveTextContent('2');
    expect(badge.closest('li')).toHaveTextContent('Em andamento');
  });

  it('when no job is in progress, should show no counter', async () => {
    const invoke = withJobs([job('1', 'completed'), job('2', 'failed')]);

    renderSidebar();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.list));

    expect(screen.queryByLabelText(/em andamento$/)).not.toBeInTheDocument();
  });

  it('when there are no jobs at all, should show no counter', async () => {
    const invoke = withJobs([]);

    renderSidebar();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.list));

    expect(screen.queryByLabelText(/em andamento$/)).not.toBeInTheDocument();
  });

  it('when the jobs cannot be loaded, should still render the menu without a counter', async () => {
    mockApi({});

    renderSidebar();

    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.queryByLabelText(/em andamento$/)).not.toBeInTheDocument();
  });

  it('when there are jobs in progress, should put the counter only on that item and not on the others', async () => {
    withJobs([job('1', 'running')]);

    renderSidebar();
    await screen.findByLabelText('1 em andamento');

    expect(screen.getAllByLabelText(/em andamento$/)).toHaveLength(1);
  });

  it('when the menu item is renamed, should no longer be called Acompanhar', () => {
    mockApi({});

    renderSidebar();

    expect(screen.queryByText('Acompanhar')).not.toBeInTheDocument();
  });
});

describe('AppSidebar: seções recolhíveis', () => {
  beforeEach(() => window.localStorage.clear());

  const trigger = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });

  it('when rendered for the first time, should show every section open', () => {
    mockApi({});

    renderSidebar();

    for (const label of ['Biblioteca', 'Tarefas', 'IA']) {
      expect(trigger(label)).toHaveAttribute('aria-expanded', 'true');
    }
    expect(screen.getByText('Conversa')).toBeVisible();
  });

  it('when a section label is clicked, should collapse it and hide its items', async () => {
    const user = userEvent.setup();
    mockApi({});

    renderSidebar();
    await user.click(trigger('IA'));

    expect(trigger('IA')).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.queryByText('Conversa')).not.toBeInTheDocument());
    expect(screen.getByText('Páginas')).toBeVisible();
  });

  it('when a collapsed section label is clicked again, should open it again', async () => {
    const user = userEvent.setup();
    mockApi({});

    renderSidebar();
    await user.click(trigger('IA'));
    await user.click(trigger('IA'));

    expect(trigger('IA')).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Conversa')).toBeVisible();
  });

  it('when a section is collapsed, should remember it in the browser', async () => {
    const user = userEvent.setup();
    mockApi({});

    renderSidebar();
    await user.click(trigger('Tarefas'));

    expect(JSON.parse(window.localStorage.getItem(COLLAPSED_GROUPS_KEY) ?? '[]')).toEqual(['Tarefas']);
  });

  it('when the app opens with collapsed sections saved, should restore them and keep the others open', async () => {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(['Biblioteca']));
    mockApi({});

    renderSidebar();

    expect(trigger('Biblioteca')).toHaveAttribute('aria-expanded', 'false');
    expect(trigger('IA')).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.queryByText('Páginas')).not.toBeInTheDocument());
    expect(screen.getByText('Conversa')).toBeVisible();
  });

  it('when the current page is in a collapsed section, should flag that section with a marker', () => {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(['IA']));
    mockApi({});

    renderSidebar('/ai/chat');

    expect(screen.getByLabelText('Página atual em IA')).toBeInTheDocument();
  });

  it('when the current page is in an open section, should show no marker', () => {
    mockApi({});

    renderSidebar('/ai/chat');

    expect(screen.queryByLabelText(/Página atual em/)).not.toBeInTheDocument();
  });

  it('when the Início group is rendered, should not be collapsible (it has no label)', () => {
    mockApi({});

    renderSidebar();

    expect(screen.getByText('Início')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Início/, expanded: true })).not.toBeInTheDocument();
  });
});

describe('findActiveUrl', () => {
  const urls = ['/', '/library', '/library/books', '/library/new', '/ai/chat'];

  it('when the path is exactly an item, should pick it', () => {
    expect(findActiveUrl('/ai/chat', urls)).toBe('/ai/chat');
  });

  it('when the path is inside an item, should pick the most specific one', () => {
    expect(findActiveUrl('/library/books/abc', urls)).toBe('/library/books');
    expect(findActiveUrl('/library/abc', urls)).toBe('/library');
  });

  it('when the path is the root, should pick only the root', () => {
    expect(findActiveUrl('/', urls)).toBe('/');
  });

  it('when no item matches, should pick none', () => {
    expect(findActiveUrl('/outra', urls)).toBeNull();
  });
});
