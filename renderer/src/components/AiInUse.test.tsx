import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AiPreference, AiSelectionState } from '#shared/contracts/ai';

import { AiInUse } from './AiInUse';

const mutate = vi.fn();
const stateRef: { data: AiSelectionState | undefined } = { data: undefined };
const switchState = { isPending: false, isError: false };

vi.mock('#hooks/use-ai-in-use', () => ({
  useAiInUse: () => ({ data: stateRef.data }),
  useSwitchSessionAi: () => ({ mutate, ...switchState }),
}));
vi.mock('#hooks/use-error-alert', () => ({ useErrorAlert: vi.fn() }));

// O seletor tem testes próprios; aqui só interessa o que o diálogo faz com a escolha.
vi.mock('./AiPicker', () => ({
  isAiPreferenceComplete: (value: AiPreference | null) =>
    value === null || value.modelId !== null || value.providerId !== 'ollama',
  AiPicker: ({
    value,
    onChange,
  }: {
    value: AiPreference | null;
    onChange: (value: AiPreference | null) => void;
  }) => (
    <div>
      <span data-testid="draft">{JSON.stringify(value)}</span>
      <button onClick={() => onChange({ providerId: 'anthropic', modelId: 'claude-x' })}>
        escolher claude
      </button>
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

describe('AiInUse', () => {
  beforeEach(() => {
    mutate.mockReset();
    stateRef.data = state();
    Object.assign(switchState, { isPending: false, isError: false });
  });

  it('when the state is not loaded yet, should render nothing', () => {
    stateRef.data = undefined;

    const { container } = render(<AiInUse />);

    expect(container).toBeEmptyDOMElement();
  });

  it('when the AI is automatic, should show the service, the model and the automatic tag', () => {
    render(<AiInUse />);

    expect(screen.getByText('Gemini · gemini-barato')).toBeInTheDocument();
    expect(screen.getByText('Automática')).toBeInTheDocument();
  });

  it('when the AI is the saved default, should tag it as default', () => {
    stateRef.data = state({
      configured: { providerId: 'anthropic', modelId: null },
      effective: { providerId: 'anthropic', modelId: 'claude-barato', source: 'default' },
    });

    render(<AiInUse />);

    expect(screen.getByText('Anthropic · claude-barato')).toBeInTheDocument();
    expect(screen.getByText('Padrão')).toBeInTheDocument();
  });

  it('when the AI was switched for this session, should say it lasts only this session', () => {
    stateRef.data = state({
      session: { providerId: 'anthropic', modelId: null },
      effective: { providerId: 'anthropic', modelId: 'claude-barato', source: 'session' },
    });

    render(<AiInUse />);

    expect(screen.getByText('Só nesta sessão')).toBeInTheDocument();
  });

  it('when clicking Trocar, should open the dialog explaining the switch lasts until the app closes', async () => {
    const user = userEvent.setup();
    render(<AiInUse />);

    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Vale só até fechar o app/)).toBeInTheDocument();
    expect(screen.getByTestId('draft')).toHaveTextContent('"providerId":"gemini"');
  });

  it('when confirming a choice, should switch the AI for this session', async () => {
    const user = userEvent.setup();
    render(<AiInUse />);
    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    await user.click(screen.getByRole('button', { name: 'escolher claude' }));
    await user.click(screen.getByRole('button', { name: 'Usar nesta sessão' }));

    expect(mutate).toHaveBeenCalledWith(
      { providerId: 'anthropic', modelId: 'claude-x' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('when the choice is incomplete (local service without a model), should not allow confirming', async () => {
    const user = userEvent.setup();
    render(<AiInUse />);
    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    await user.click(screen.getByRole('button', { name: 'escolher ollama sem modelo' }));

    expect(screen.getByRole('button', { name: 'Usar nesta sessão' })).toBeDisabled();
  });

  it('when there is no switch for the session, should not offer going back to the default', async () => {
    const user = userEvent.setup();
    render(<AiInUse />);

    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    expect(screen.queryByRole('button', { name: 'Voltar ao padrão' })).not.toBeInTheDocument();
  });

  it('when the AI was switched, should offer going back to the default (sends null)', async () => {
    stateRef.data = state({
      session: { providerId: 'anthropic', modelId: null },
      effective: { providerId: 'anthropic', modelId: 'claude-barato', source: 'session' },
    });
    const user = userEvent.setup();
    render(<AiInUse />);
    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    await user.click(screen.getByRole('button', { name: 'Voltar ao padrão' }));

    expect(mutate).toHaveBeenCalledWith(null, expect.anything());
  });

  it('when the switch is being saved, should disable cancelling', async () => {
    Object.assign(switchState, { isPending: true });
    const user = userEvent.setup();
    render(<AiInUse />);

    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
