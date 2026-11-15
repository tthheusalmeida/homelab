import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok, openCard, payloadsOf, renderWithProviders } from '../testing';

import { ExternalProvidersSection } from './ExternalProvidersSection';

const unconfigured = { id: 'gemini', label: 'Gemini', configured: false, maskedKey: null };
const configured = { ...unconfigured, configured: true, maskedKey: '••••••••1234' };

describe('ExternalProvidersSection', () => {
  it('when loaded, should show the provider collapsed with its title, status and one-line description', async () => {
    mockApi({ [IpcChannels.providers.external.list]: () => ok([configured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);

    const trigger = await screen.findByRole('button', { name: /^Gemini/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Configurada');
    expect(trigger).toHaveTextContent('Modelos de IA do Google, na nuvem.');
    expect(screen.queryByLabelText(/chave da API/i)).not.toBeInTheDocument();
  });

  it('when the key is not configured, should say so in the header', async () => {
    mockApi({ [IpcChannels.providers.external.list]: () => ok([unconfigured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);

    expect(await screen.findByText('Não configurada')).toBeVisible();
  });

  it('when opening the card, should show the empty key field and the hint to inform it', async () => {
    const user = userEvent.setup();
    mockApi({ [IpcChannels.providers.external.list]: () => ok([unconfigured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    expect(screen.getByText(/Informe a chave da API/)).toBeVisible();
    expect(screen.getByLabelText('Chave da API')).toHaveValue('');
  });

  it('when the key is configured and the card is opened, should show only the masked key', async () => {
    const user = userEvent.setup();
    mockApi({ [IpcChannels.providers.external.list]: () => ok([configured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    expect(screen.getByText('Chave atual: ••••••••1234')).toBeVisible();
    expect(screen.getByLabelText('Nova chave da API')).toHaveAttribute('type', 'password');
  });

  it('when no key was typed, should disable save and, if not configured, also test', async () => {
    const user = userEvent.setup();
    mockApi({ [IpcChannels.providers.external.list]: () => ok([unconfigured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Testar' })).toBeDisabled();
  });

  it('when a key is typed and saved, should send it trimmed, clear the field, report a restart and show the snackbar', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const invoke = mockApi({
      [IpcChannels.providers.external.list]: () => ok([unconfigured]),
      [IpcChannels.providers.external.save]: () => ok({ value: configured, restartRequired: true }),
    });

    renderWithProviders(<ExternalProvidersSection onSaved={onSaved} />);
    await openCard(user, 'Gemini');

    await user.type(screen.getByLabelText('Chave da API'), '  AIza-nova  ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    expect(payloadsOf(invoke, IpcChannels.providers.external.save)).toEqual([
      { id: 'gemini', apiKey: 'AIza-nova' },
    ]);
    expect(screen.getByLabelText(/chave da API/i)).toHaveValue('');
    expect(await screen.findByRole('status')).toHaveTextContent('Salvo');
  });

  it('when testing a typed key, should test that candidate and show the success message', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.providers.external.list]: () => ok([unconfigured]),
      [IpcChannels.providers.external.test]: () =>
        ok({ ok: true, message: 'Conexão com o Gemini funcionando.' }),
    });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    await user.type(screen.getByLabelText('Chave da API'), 'AIza-candidata');
    await user.click(screen.getByRole('button', { name: 'Testar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Conexão com o Gemini funcionando.',
    );
    expect(payloadsOf(invoke, IpcChannels.providers.external.test)).toEqual([
      { id: 'gemini', apiKey: 'AIza-candidata' },
    ]);
  });

  it('when testing the saved key without typing, should not send a key', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.providers.external.list]: () => ok([configured]),
      [IpcChannels.providers.external.test]: () => ok({ ok: true, message: 'ok' }),
    });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');
    await user.click(screen.getByRole('button', { name: 'Testar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.providers.external.test)).toEqual([
        { id: 'gemini', apiKey: undefined },
      ]),
    );
  });

  it('when the test fails, should show the reason', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.providers.external.list]: () => ok([configured]),
      [IpcChannels.providers.external.test]: () =>
        ok({ ok: false, message: 'Falha ao conectar ao Gemini: API key not valid.' }),
    });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');
    await user.click(screen.getByRole('button', { name: 'Testar' }));

    expect(await screen.findByRole('status')).toHaveTextContent('API key not valid.');
  });

  it('when the key is saved after a failed test, should clear the old test result', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.providers.external.list]: () => ok([unconfigured]),
      [IpcChannels.providers.external.test]: () =>
        ok({ ok: false, message: 'Falha ao conectar ao Gemini: API key not valid.' }),
      [IpcChannels.providers.external.save]: () => ok({ value: configured, restartRequired: true }),
    });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    await user.type(screen.getByLabelText('Chave da API'), 'AIza-x');
    await user.click(screen.getByRole('button', { name: 'Testar' }));
    expect(await screen.findByText(/API key not valid/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Salvo')).toBeVisible();
    expect(screen.queryByText(/API key not valid/)).not.toBeInTheDocument();
  });

  it('when saving fails, should show the error message and no snackbar', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.providers.external.list]: () => ok([unconfigured]),
      [IpcChannels.providers.external.save]: () =>
        failure(
          'INTERNAL',
          'A criptografia do sistema não está disponível; a chave não foi salva.',
        ),
    });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    await user.type(screen.getByLabelText('Chave da API'), 'AIza-x');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('criptografia do sistema');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when the key is not configured, should open the card with the step by step to create it', async () => {
    mockApi({ [IpcChannels.providers.external.list]: () => ok([unconfigured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);

    expect(await screen.findByRole('region', { name: 'Como criar a chave do Gemini' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByRole('link', { name: /Abrir o AI Studio/ })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/apikey',
    );
    expect(screen.getByRole('link', { name: /Abrir o AI Studio/ })).toHaveAttribute('target', '_blank');
  });

  it('when the key is already configured, should not show the step by step', async () => {
    mockApi({ [IpcChannels.providers.external.list]: () => ok([configured]) });
    const user = userEvent.setup();

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    expect(screen.queryByRole('region', { name: 'Como criar a chave do Gemini' })).not.toBeInTheDocument();
  });

  it('when the key is saved and the list reloads as configured, should hide the step by step', async () => {
    const user = userEvent.setup();
    let saved = false;
    mockApi({
      [IpcChannels.providers.external.list]: () => ok([saved ? configured : unconfigured]),
      [IpcChannels.providers.external.save]: () => {
        saved = true;

        return ok({ value: configured, restartRequired: true });
      },
    });
    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await screen.findByRole('region', { name: 'Como criar a chave do Gemini' });

    await user.type(screen.getByLabelText('Chave da API'), 'AIza123');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Como criar a chave do Gemini' })).not.toBeInTheDocument(),
    );
  });

  it('when the key is configured, should point to the provider panel where the real spend lives', async () => {
    const user = userEvent.setup();
    mockApi({ [IpcChannels.providers.external.list]: () => ok([configured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await openCard(user, 'Gemini');

    expect(screen.getByRole('link', { name: /ver consumo no Gemini/ })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/usage',
    );
  });

  it('when the key is not configured yet, should not show the consumption link', async () => {
    mockApi({ [IpcChannels.providers.external.list]: () => ok([unconfigured]) });

    renderWithProviders(<ExternalProvidersSection onSaved={vi.fn()} />);
    await screen.findByText('Não configurada');

    expect(screen.queryByRole('link', { name: /ver consumo/ })).not.toBeInTheDocument();
  });
});
