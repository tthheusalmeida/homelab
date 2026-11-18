import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, mockApi, ok } from '#test/api-mock';

import { createTestQueryClient } from '../../test/utils';
import { PageHeader } from '#components/PageHeader';
import { AppLayout } from './AppLayout';

function Where() {
  const { pathname, search } = useLocation();

  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

const renderLayout = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Where />} />
            <Route path="settings" element={<Where />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const base = (pendingSection: string | null) => ({
  [IpcChannels.app.settingsSection]: () => ok(pendingSection),
  [IpcChannels.app.restartPending]: () => ok(false),
});

describe('AppLayout settings navigation', () => {
  it('when the main has no pending section, should stay on the current screen', async () => {
    const invoke = mockApi(base(null));

    renderLayout();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.app.settingsSection));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });

  it('when the app opens with a pending section (first run), should go to the settings in that section', async () => {
    mockApi(base('external'));

    renderLayout();

    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/settings?section=external'),
    );
  });

  it('when the main asks for the settings with a section, should navigate to it', async () => {
    mockApi(base(null));
    renderLayout();

    act(() => emitEvent(IpcEvents.settingsNavigate, { section: 'components' }));

    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent('/settings?section=components'),
    );
  });

  it('when the main asks for the settings without a section (Ctrl+,), should open the plain route', async () => {
    mockApi(base(null));
    renderLayout();

    act(() => emitEvent(IpcEvents.settingsNavigate, {}));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/settings$/));
  });
});

describe('AppLayout page header', () => {
  const renderWithHeader = (path: string) => {
    mockApi(base(null));

    return render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<PageHeader title="Páginas" command="library --pages" />} />
              <Route
                path="ai/chat"
                element={<PageHeader title="Conversa" command="ai --chat" />}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('when a screen has a page header, should pin it above the scroll area so it never scrolls', async () => {
    const { container } = renderWithHeader('/');

    const header = await screen.findByRole('heading', { level: 1, name: 'Páginas' });
    const slot = container.querySelector('[data-slot=page-header-slot]');

    expect(slot).toContainElement(header);
    expect(container.querySelector('[data-slot=scroll-area]')).not.toContainElement(header);
  });

  it('when the screen fills the area (the chat), should also keep the header in the fixed slot', async () => {
    const { container } = renderWithHeader('/ai/chat');

    const header = await screen.findByRole('heading', { level: 1, name: 'Conversa' });

    expect(container.querySelector('[data-slot=page-header-slot]')).toContainElement(header);
  });
});
