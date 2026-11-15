import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithQuery } from '#test/utils';

import { IpcChannels } from '#shared/channels';

import { SettingsApp } from './SettingsApp';
import { mockApi, ok, payloadsOf } from './testing';

const paths = {
  libraryDir: 'D:/lib',
  inboxDir: 'D:/inbox',
  videoTempDir: 'D:/tmp/video',
  audioTempDir: 'D:/tmp/audio',
};

const handlers = (restartRequired: boolean) => {
  let current = paths;

  return {
    [IpcChannels.settings.get]: () => ok(current),
    [IpcChannels.settings.update]: (payload: unknown) => {
      current = payload as typeof paths;

      return ok({ value: current, restartRequired });
    },
    [IpcChannels.providers.external.list]: () =>
      ok([{ id: 'gemini', label: 'Gemini', configured: false, maskedKey: null }]),
    [IpcChannels.providers.local.list]: () =>
      ok([{ id: 'ffmpeg', label: 'ffmpeg', editable: false, config: {} }]),
    [IpcChannels.app.relaunch]: () => ok(undefined),
  };
};

describe('SettingsApp', () => {
  it('when opened, should start on the folders section', async () => {
    mockApi(handlers(true));

    renderWithQuery(<SettingsApp />);

    expect(screen.getByRole('heading', { level: 2, name: 'Pastas' })).toBeVisible();
    expect(await screen.findByLabelText('Biblioteca')).toBeVisible();
    expect(screen.getByRole('button', { name: /Pastas/ })).toHaveAttribute('aria-current', 'page');
  });

  it('when navigating, should switch the section content and the active item', async () => {
    const user = userEvent.setup();
    mockApi(handlers(true));

    renderWithQuery(<SettingsApp />);

    await user.click(screen.getByRole('button', { name: /IAs externas/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'IAs externas' })).toBeVisible();
    expect(await screen.findByText('Não configurada')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Serviços locais/ }));
    expect(await screen.findByText('Somente teste')).toBeVisible();
    expect(screen.getByRole('button', { name: /Serviços locais/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('when nothing was saved, should not show the restart notice', async () => {
    mockApi(handlers(true));

    renderWithQuery(<SettingsApp />);

    await screen.findByLabelText('Biblioteca');
    expect(screen.queryByText(/depois de reiniciar/)).not.toBeInTheDocument();
  });

  it('when a save requires restart, should show the notice and restart on demand', async () => {
    const user = userEvent.setup();
    const invoke = mockApi(handlers(true));

    renderWithQuery(<SettingsApp />);

    const field = await screen.findByLabelText('Biblioteca');
    await user.clear(field);
    await user.type(field, 'D:/outra');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText(/depois de reiniciar/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Reiniciar agora' }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.app.relaunch)).toHaveLength(1));
  });

  it('when the restart notice is visible, should lift the snackbar so it does not cover the restart button', async () => {
    const user = userEvent.setup();
    mockApi(handlers(true));

    renderWithQuery(<SettingsApp />);

    const field = await screen.findByLabelText('Biblioteca');
    await user.clear(field);
    await user.type(field, 'D:/outra');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('status')).toHaveClass('bottom-20');
  });

  it('when a save does not require restart, should not show the notice', async () => {
    const user = userEvent.setup();
    mockApi(handlers(false));

    renderWithQuery(<SettingsApp />);

    const field = await screen.findByLabelText('Biblioteca');
    await user.clear(field);
    await user.type(field, 'D:/outra');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Salvo')).toBeVisible();
    expect(screen.queryByText(/depois de reiniciar/)).not.toBeInTheDocument();
  });
});
