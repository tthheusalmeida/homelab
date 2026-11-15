import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '../../../../src/shared/channels';
import { failure, mockApi, ok, openCard, payloadsOf, renderWithProviders } from '../testing';

import { LocalProvidersSection } from './LocalProvidersSection';

const providers = [
  {
    id: 'whisper',
    label: 'Whisper',
    editable: true,
    config: { directory: 'D:/whisper', executable: 'whisper-cli.exe', model: 'modelo.bin' },
  },
  { id: 'ollama', label: 'Ollama', editable: true, config: { url: 'http://localhost:11434' } },
  { id: 'ffmpeg', label: 'ffmpeg', editable: false, config: {} },
];

const list = { [IpcChannels.providers.local.list]: () => ok(providers) };

describe('LocalProvidersSection', () => {
  it('when loaded, should show every provider collapsed with title and one-line description', async () => {
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);

    for (const [name, hint] of [
      ['Whisper', 'Transcreve os áudios localmente.'],
      ['Ollama', 'Modelos de linguagem locais.'],
      ['ffmpeg', 'Converte vídeo em áudio, usando o ffmpeg instalado no sistema.'],
    ]) {
      const trigger = await screen.findByRole('button', { name: new RegExp(`^${name}`) });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveTextContent(hint);
    }
    expect(screen.queryByLabelText('Endereço (URL)')).not.toBeInTheDocument();
  });

  it('when a provider is opened, should show its config and leave the others collapsed', async () => {
    const user = userEvent.setup();
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Whisper');

    expect(screen.getByLabelText('Pasta')).toHaveValue('D:/whisper');
    expect(screen.getByLabelText('Executável')).toHaveValue('whisper-cli.exe');
    expect(screen.getByLabelText('Arquivo de modelo (nome ou caminho completo)')).toHaveValue(
      'modelo.bin',
    );
    expect(screen.queryByLabelText('Endereço (URL)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Whisper/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('when the same provider is clicked again, should collapse it', async () => {
    const user = userEvent.setup();
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Ollama');
    expect(screen.getByLabelText('Endereço (URL)')).toBeVisible();

    await openCard(user, 'Ollama');

    await waitFor(() => expect(screen.queryByLabelText('Endereço (URL)')).not.toBeInTheDocument());
  });

  it('when a field is edited and the card is collapsed and reopened, should keep what was typed', async () => {
    const user = userEvent.setup();
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Ollama');

    const url = screen.getByLabelText('Endereço (URL)');
    await user.clear(url);
    await user.type(url, 'http://outro:1234');
    await openCard(user, 'Ollama');
    await waitFor(() => expect(screen.queryByLabelText('Endereço (URL)')).not.toBeInTheDocument());
    await openCard(user, 'Ollama');

    expect(screen.getByLabelText('Endereço (URL)')).toHaveValue('http://outro:1234');
  });

  it('when a provider is read-only, should offer only the test', async () => {
    const user = userEvent.setup();
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'ffmpeg');

    expect(await screen.findByText('Somente teste')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Testar' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('when only the whisper folder is pickable, should show a folder button just for it', async () => {
    const user = userEvent.setup();
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Whisper');

    expect(screen.getAllByRole('button', { name: /Escolher pasta/ })).toHaveLength(1);
  });

  it('when a field is edited and saved, should send the whole config, report a restart and show the snackbar', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const invoke = mockApi({
      ...list,
      [IpcChannels.providers.local.save]: () => ok({ value: providers[1], restartRequired: true }),
    });

    renderWithProviders(<LocalProvidersSection onSaved={onSaved} />);
    await openCard(user, 'Ollama');

    const url = screen.getByLabelText('Endereço (URL)');
    await user.clear(url);
    await user.type(url, 'http://outro:1234');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    expect(payloadsOf(invoke, IpcChannels.providers.local.save)).toEqual([
      { id: 'ollama', config: { url: 'http://outro:1234' } },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo');
  });

  it('when nothing was edited, should keep save disabled', async () => {
    const user = userEvent.setup();
    mockApi(list);

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Whisper');

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('when testing with unsaved edits, should send the edited config; otherwise only the id', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      ...list,
      [IpcChannels.providers.local.test]: () => ok({ ok: true, message: 'Ollama respondeu.' }),
    });

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Ollama');

    await user.click(screen.getByRole('button', { name: 'Testar' }));
    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.providers.local.test)).toHaveLength(1),
    );

    const url = screen.getByLabelText('Endereço (URL)');
    await user.clear(url);
    await user.type(url, 'http://novo:1');
    await user.click(screen.getByRole('button', { name: 'Testar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.providers.local.test)).toEqual([
        { id: 'ollama', config: undefined },
        { id: 'ollama', config: { url: 'http://novo:1' } },
      ]),
    );
  });

  it('when a test fails, should show the reason', async () => {
    const user = userEvent.setup();
    mockApi({
      ...list,
      [IpcChannels.providers.local.test]: () =>
        ok({
          ok: false,
          message: 'Não foi possível conectar ao Ollama em http://localhost:11434.',
        }),
    });

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Ollama');
    await user.click(screen.getByRole('button', { name: 'Testar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível conectar ao Ollama',
    );
  });

  it('when saving is rejected, should show the validation message and no snackbar', async () => {
    const user = userEvent.setup();
    mockApi({
      ...list,
      [IpcChannels.providers.local.save]: () =>
        failure('VALIDATION', 'A URL do Ollama deve ser um endereço http ou https válido.'),
    });

    renderWithProviders(<LocalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Ollama');

    const url = screen.getByLabelText('Endereço (URL)');
    await user.clear(url);
    await user.type(url, 'nao-e-url');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('URL do Ollama');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
