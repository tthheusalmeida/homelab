import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';

import { SidebarProvider } from '#ui/sidebar';

import { IpcChannels } from '#shared/channels';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { AppSidebar } from './AppSidebar';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <SidebarProvider>
        <AppSidebar />
        <Where />
      </SidebarProvider>
    </MemoryRouter>,
  );

describe('AppSidebar', () => {
  it('when rendered, should keep the original sections and items of the front', () => {
    mockApi({});

    renderSidebar();

    for (const label of ['HomeLab', 'Biblioteca', 'AI', 'Jobs']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const item of ['Início', 'Páginas', 'Livros', 'Entrada', 'Nova página', 'Chat', 'Uso']) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
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
    const lastNavItem = screen.getByText('Inspeção');

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
