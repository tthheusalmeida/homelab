import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithQuery } from '#test/utils';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';

import { SidebarProvider } from '#ui/sidebar';

import { SettingsApp } from './SettingsApp';
import { mockApi, ok, payloadsOf } from './testing';

const paths = { libraryDir: 'D:/lib' };

const handlers = (restartRequired: boolean, restartAlreadyPending = false) => {
  let current = paths;

  return {
    [IpcChannels.settings.get]: () => ok(current),
    [IpcChannels.settings.inspectLibrary]: (payload: unknown) =>
      ok({ path: (payload as { path: string }).path, exists: false, empty: true, fileCount: 0 }),
    [IpcChannels.settings.moveLibrary]: (payload: unknown) => {
      current = { libraryDir: (payload as { to: string }).to };

      return ok({
        libraryDir: current.libraryDir,
        filesCopied: 0,
        bytesCopied: 0,
        originRemoved: false,
        restartRequired,
      });
    },
    [IpcChannels.providers.external.list]: () =>
      ok([{ id: 'gemini', label: 'Gemini', configured: false, maskedKey: null }]),
    [IpcChannels.providers.local.list]: () =>
      ok([{ id: 'ffmpeg', label: 'Processamento de áudio', editable: false, config: {} }]),
    [IpcChannels.app.relaunch]: () => ok(undefined),
    [IpcChannels.app.restartPending]: () => ok(restartAlreadyPending),
    [IpcChannels.app.markRestartPending]: () => ok(undefined),
  };
};

const renderApp = () =>
  renderWithQuery(
    <AppearanceProvider>
      <SidebarProvider><SettingsApp /></SidebarProvider>
    </AppearanceProvider>,
  );

/** A janela abre em Aparência: vai para a Biblioteca pelo menu. */
const openLibrary = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /^Biblioteca/ }));

/** Troca a pasta da biblioteca pelo fluxo real: edita, salva e confirma o diálogo. */
async function changeLibrary(user: ReturnType<typeof userEvent.setup>, value: string) {
  await openLibrary(user);
  const field = await screen.findByLabelText('Biblioteca');

  await user.clear(field);
  await user.type(field, value);
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
  await user.click(await screen.findByRole('button', { name: 'Mover e usar' }));
}

describe('SettingsApp', () => {
  it('when opened, should start on the appearance section, the first of the menu', async () => {
    mockApi(handlers(true));

    renderApp();

    expect(screen.getByRole('heading', { level: 2, name: 'Aparência' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Aparência/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(await screen.findByRole('radiogroup', { name: 'Cor de destaque' })).toBeVisible();
  });

  it('when the library item is chosen, should show the library section', async () => {
    const user = userEvent.setup();
    mockApi(handlers(true));

    renderApp();
    await openLibrary(user);

    expect(screen.getByRole('heading', { level: 2, name: 'Biblioteca' })).toBeVisible();
    expect(await screen.findByLabelText('Biblioteca')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Biblioteca/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('when navigating, should switch the section content and the active item', async () => {
    const user = userEvent.setup();
    mockApi(handlers(true));

    renderApp();

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
    const user = userEvent.setup();
    mockApi(handlers(true));

    renderApp();
    await openLibrary(user);

    await screen.findByLabelText('Biblioteca');
    expect(screen.queryByText(/depois de reiniciar/)).not.toBeInTheDocument();
  });

  it('when a save requires restart, should show the notice and restart on demand', async () => {
    const user = userEvent.setup();
    const invoke = mockApi(handlers(true));

    renderApp();

    await changeLibrary(user, 'D:/outra');

    expect(await screen.findByText(/depois de reiniciar/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Reiniciar agora' }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.app.relaunch)).toHaveLength(1));
  });

  it('when the restart notice is visible, should lift the snackbar so it does not cover the restart button', async () => {
    const user = userEvent.setup();
    mockApi(handlers(true));

    renderApp();

    await changeLibrary(user, 'D:/outra');

    expect((await screen.findByRole('status')).closest('[data-region]')).toHaveClass('bottom-20');
  });

  it('when a save does not require restart, should not show the notice', async () => {
    const user = userEvent.setup();
    mockApi(handlers(false));

    renderApp();

    await changeLibrary(user, 'D:/outra');

    expect(await screen.findByText('Biblioteca trocada')).toBeVisible();
    expect(screen.queryByText(/depois de reiniciar/)).not.toBeInTheDocument();
  });

  it('when a save requires restart, should also tell the main so the app sidebar keeps the notice after this window closes', async () => {
    const user = userEvent.setup();
    const invoke = mockApi(handlers(true));

    renderApp();
    await changeLibrary(user, 'D:/outra');

    await screen.findByText(/depois de reiniciar/);
    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.app.markRestartPending)).toHaveLength(1),
    );
  });

  it('when a save does not require restart, should not mark anything as pending', async () => {
    const user = userEvent.setup();
    const invoke = mockApi(handlers(false));

    renderApp();
    await changeLibrary(user, 'D:/outra');
    await screen.findByText('Biblioteca trocada');

    expect(payloadsOf(invoke, IpcChannels.app.markRestartPending)).toHaveLength(0);
  });

  it('when the window opens and the main already has a restart pending, should show the notice with the restart button', async () => {
    mockApi(handlers(false, true));

    renderApp();

    expect(await screen.findByText(/depois de reiniciar/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reiniciar agora' })).toBeVisible();
  });
});
