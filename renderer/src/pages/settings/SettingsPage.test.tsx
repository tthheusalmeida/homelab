import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { mockApi, ok } from '#test/api-mock';
import { setupStatus } from '#test/components-fixtures';
import { SidebarProvider } from '#ui/sidebar';

import { createTestQueryClient } from '../../test/utils';
import { SettingsPage } from './SettingsPage';

const renderAt = (path: string) =>
  render(
    <AppearanceProvider>
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <SidebarProvider>
            <SettingsPage />
          </SidebarProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </AppearanceProvider>,
  );

describe('SettingsPage', () => {
  it('when the address has a section, should open the settings on it', async () => {
    mockApi({
      [IpcChannels.settings.get]: () => ok({ libraryDir: 'D:/lib' }),
      [IpcChannels.components.status]: () => ok(setupStatus()),
    });

    renderAt('/settings?section=components');

    expect(await screen.findByRole('heading', { level: 2, name: 'Componentes' })).toBeVisible();
  });

  it('when the address has no section, should open on Aparência', async () => {
    mockApi({ [IpcChannels.settings.get]: () => ok({ libraryDir: 'D:/lib' }) });

    renderAt('/settings');

    expect(await screen.findByRole('heading', { level: 2, name: 'Aparência' })).toBeVisible();
  });
});
