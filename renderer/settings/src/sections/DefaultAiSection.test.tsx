import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import type { AiSelectionState } from '#shared/contracts/ai';

import { mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { DefaultAiSection } from './DefaultAiSection';

// O seletor tem testes próprios; aqui só interessa o que a seção faz com a escolha.
vi.mock('#components/AiPicker', () => ({
  isAiPreferenceComplete: (value: { providerId: string; modelId: string | null } | null) =>
    value === null || value.modelId !== null || value.providerId !== 'ollama',
  AiPicker: ({
    value,
    onChange,
    allowAuto,
  }: {
    value: unknown;
    onChange: (value: unknown) => void;
    allowAuto?: boolean;
  }) => (
    <div>
      <span data-testid="value">{JSON.stringify(value)}</span>
      <span data-testid="allow-auto">{String(Boolean(allowAuto))}</span>
      <button onClick={() => onChange({ providerId: 'anthropic', modelId: null })}>
        escolher anthropic
      </button>
      <button onClick={() => onChange(null)}>escolher automática</button>
      <button onClick={() => onChange({ providerId: 'ollama', modelId: null })}>
        escolher ollama sem modelo
      </button>
    </div>
  ),
}));

const state = (overrides: Partial<AiSelectionState> = {}): AiSelectionState => ({
  configured: null,
  session: null,
  effective: { providerId: 'gemini', modelId: 'gemini-barato', source: 'auto' },
  ...overrides,
});

describe('DefaultAiSection', () => {
  let current: AiSelectionState;

  let invoke: ReturnType<typeof mockApi>;

  beforeEach(() => {
    current = state();
    invoke = mockApi({
      [IpcChannels.ai.selection]: () => ok(current),
      [IpcChannels.ai.defaultUpdate]: (payload) => {
        const { preference } = payload as { preference: AiSelectionState['configured'] };

        current = state({
          configured: preference,
          effective: preference
            ? { providerId: preference.providerId, modelId: 'claude-barato', source: 'default' }
            : current.effective,
        });

        return ok(preference);
      },
    });
  });

  it('when loaded, should show the AI in use now and allow the automatic choice', async () => {
    renderWithProviders(<DefaultAiSection />);

    expect(await screen.findByText('Gemini · gemini-barato')).toBeInTheDocument();
    expect(screen.getByText(/\(automática\)/)).toBeInTheDocument();
    expect(screen.getByTestId('allow-auto')).toHaveTextContent('true');
  });

  it('when the default is automatic, should explain what automatic means', async () => {
    renderWithProviders(<DefaultAiSection />);

    expect(await screen.findByText(/usa o modelo mais barato do primeiro serviço/)).toBeVisible();
  });

  it('when nothing was changed, should keep Save disabled', async () => {
    renderWithProviders(<DefaultAiSection />);

    expect(await screen.findByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('when a service is chosen, should enable Save and send the preference when saved', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DefaultAiSection />);
    await user.click(await screen.findByRole('button', { name: 'escolher anthropic' }));

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(payloadsOf(invoke, IpcChannels.ai.defaultUpdate)).toEqual([
      { preference: { providerId: 'anthropic', modelId: null } },
    ]);
    expect(await screen.findByText('IA padrão salva.')).toBeInTheDocument();
  });

  it('when the saved default exists and automatic is chosen, should send null to clear it', async () => {
    current = state({
      configured: { providerId: 'anthropic', modelId: null },
      effective: { providerId: 'anthropic', modelId: 'claude-barato', source: 'default' },
    });
    const user = userEvent.setup();
    renderWithProviders(<DefaultAiSection />);
    await user.click(await screen.findByRole('button', { name: 'escolher automática' }));

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(payloadsOf(invoke, IpcChannels.ai.defaultUpdate)).toEqual([{ preference: null }]);
  });

  it('when the choice is incomplete (local service without a model), should keep Save disabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DefaultAiSection />);

    await user.click(await screen.findByRole('button', { name: 'escolher ollama sem modelo' }));

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
});
