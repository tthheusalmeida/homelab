import { describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { setupStatus } from '#test/components-fixtures';
import { renderWithQuery } from '#test/utils';

import { SettingsApp } from './SettingsApp';
import { emitEvent, mockApi, ok } from './testing';

const base = (pendingSection: string | null) => ({
  [IpcChannels.settings.get]: () => ok({ libraryDir: 'D:/lib' }),
  [IpcChannels.components.status]: () => ok(setupStatus()),
  [IpcChannels.app.settingsSection]: () => ok(pendingSection),
});

describe('SettingsApp navigation to a requested section', () => {
  it('when the main process has a pending section, should open on it', async () => {
    mockApi(base('components'));

    renderWithQuery(<SettingsApp />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Componentes' })).toBeVisible();
    expect(await screen.findByText('Seu computador')).toBeInTheDocument();
  });

  it('when there is no pending section, should stay on the library section', async () => {
    mockApi(base(null));

    renderWithQuery(<SettingsApp />);

    expect(screen.getByRole('heading', { level: 2, name: 'Biblioteca' })).toBeVisible();
    expect(await screen.findByLabelText('Biblioteca')).toBeVisible();
  });

  it('when the window is already open and the main asks for a section, should navigate to it', async () => {
    mockApi(base(null));

    renderWithQuery(<SettingsApp />);
    await screen.findByLabelText('Biblioteca');

    act(() => emitEvent(IpcEvents.settingsNavigate, { section: 'components' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Componentes' })).toBeVisible();
  });

  it('when the requested section does not exist, should ignore it', async () => {
    mockApi(base('inexistente'));

    renderWithQuery(<SettingsApp />);

    expect(await screen.findByLabelText('Biblioteca')).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Biblioteca' })).toBeVisible();
  });
});
