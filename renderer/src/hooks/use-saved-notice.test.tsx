import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SnackbarProvider } from '#components/Snackbar';
import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok, payloadsOf } from '#test/api-mock';

import { REVEAL_LABEL, REVEAL_MISSING, useSavedNotice } from './use-saved-notice';

function Probe({ path }: { path?: string }) {
  const notify = useSavedNotice();

  return (
    <button type="button" onClick={() => notify('Imagem salva.', path)}>
      salvar
    </button>
  );
}

const renderProbe = (path?: string) =>
  render(
    <SnackbarProvider>
      <Probe path={path} />
    </SnackbarProvider>,
  );

describe('useSavedNotice', () => {
  beforeEach(() => {
    mockApi({ [IpcChannels.app.revealFile]: () => ok(true) });
  });

  it('when the file path is known, should show the message with a "Ver" button', async () => {
    renderProbe('C:\\docs\\mapa.png');

    await userEvent.click(screen.getByRole('button', { name: 'salvar' }));

    expect(await screen.findByText('Imagem salva.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: REVEAL_LABEL })).toBeInTheDocument();
  });

  it('when there is no path, should show only the message', async () => {
    renderProbe();

    await userEvent.click(screen.getByRole('button', { name: 'salvar' }));

    expect(await screen.findByText('Imagem salva.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: REVEAL_LABEL })).toBeNull();
  });

  it('when "Ver" is clicked, should ask the app to reveal that file', async () => {
    const api = mockApi({ [IpcChannels.app.revealFile]: () => ok(true) });

    renderProbe('C:\\docs\\mapa.png');
    await userEvent.click(screen.getByRole('button', { name: 'salvar' }));
    await userEvent.click(await screen.findByRole('button', { name: REVEAL_LABEL }));

    await waitFor(() =>
      expect(payloadsOf(api, IpcChannels.app.revealFile)).toEqual([{ path: 'C:\\docs\\mapa.png' }]),
    );
  });

  it('when the file is gone, should tell the user instead of failing silently', async () => {
    mockApi({ [IpcChannels.app.revealFile]: () => ok(false) });

    renderProbe('C:\\docs\\sumiu.png');
    await userEvent.click(screen.getByRole('button', { name: 'salvar' }));
    await userEvent.click(await screen.findByRole('button', { name: REVEAL_LABEL }));

    expect(await screen.findByText(REVEAL_MISSING)).toBeInTheDocument();
  });

  it('when opening the folder fails, should show the error message', async () => {
    mockApi({ [IpcChannels.app.revealFile]: () => failure('INTERNAL', 'Sem permissão') });

    renderProbe('C:\\docs\\mapa.png');
    await userEvent.click(screen.getByRole('button', { name: 'salvar' }));
    await userEvent.click(await screen.findByRole('button', { name: REVEAL_LABEL }));

    expect(await screen.findByText('Sem permissão')).toBeInTheDocument();
  });

});
