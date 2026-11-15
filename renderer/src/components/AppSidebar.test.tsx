import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';

import { SidebarProvider } from '#ui/sidebar';

import { IpcChannels } from '#shared/channels';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { AppSidebar, findActiveUrl } from './AppSidebar';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderSidebar = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarProvider>
        <AppSidebar />
        <Where />
      </SidebarProvider>
    </MemoryRouter>,
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
      'Acompanhar',
    ]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it('when rendered, should list the sections in the order HomeLab, IA, Biblioteca and Tarefas', () => {
    mockApi({});

    renderSidebar();

    const order = ['HomeLab', 'IA', 'Biblioteca', 'Tarefas'].map((label) =>
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
    ['/jobs/track', 'Acompanhar'],
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
    const lastNavItem = screen.getByText('Acompanhar');

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
