import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { setupStatus } from '#test/components-fixtures';
import { renderWithQuery } from '#test/utils';
import { SidebarProvider } from '#ui/sidebar';

import { SettingsApp } from './SettingsApp';
import { mockApi, ok } from './testing';

const handlers = {
  [IpcChannels.settings.get]: () => ok({ libraryDir: 'D:/lib' }),
  [IpcChannels.components.status]: () => ok(setupStatus()),
};

const renderApp = (initialSection?: string | null) =>
  renderWithQuery(
    <AppearanceProvider>
      <SidebarProvider>
        <SettingsApp initialSection={initialSection} />
      </SidebarProvider>
    </AppearanceProvider>,
  );

describe('SettingsApp navigation to a requested section', () => {
  it('when a section is requested, should open on it', async () => {
    mockApi(handlers);

    renderApp('components');

    expect(await screen.findByRole('heading', { level: 2, name: 'Componentes' })).toBeVisible();
    expect(await screen.findByText('Seu computador')).toBeInTheDocument();
  });

  it('when the infographic section is requested, should open the gallery with the models tab', async () => {
    mockApi(handlers);

    renderApp('infographic');

    expect(screen.getByRole('heading', { level: 2, name: 'Infográfico' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Modelos', pressed: true })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Peças' })).toBeVisible();
  });

  it('when there is no requested section, should stay on the first section (appearance)', async () => {
    mockApi(handlers);

    renderApp(null);

    expect(screen.getByRole('heading', { level: 2, name: 'Aparência' })).toBeVisible();
    expect(await screen.findByRole('radiogroup', { name: 'Tema' })).toBeVisible();
  });

  it('when the requested section does not exist, should ignore it', async () => {
    mockApi(handlers);

    renderApp('inexistente');

    expect(await screen.findByRole('radiogroup', { name: 'Tema' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Aparência' })).toBeVisible();
  });
});
