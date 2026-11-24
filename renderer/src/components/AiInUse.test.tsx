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
    window.localStorage.clear();
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

  describe('inline (not floating)', () => {
    it('when not collapsible, should always show the whole chip with no hide button', () => {
      render(<AiInUse />);

      expect(screen.getByText('Gemini · gemini-barato')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ocultar' })).not.toBeInTheDocument();
    });

    it('when rendered, should keep 8px of padding on every side', () => {
      const { container } = render(<AiInUse />);

      expect(container.firstElementChild).toHaveClass('p-2');
      expect(container.firstElementChild).not.toHaveClass('px-2', 'py-1');
    });
  });

  describe('floating (collapsible)', () => {
    const iconButton = () => screen.getByRole('button', { name: /IA em uso/ });
    const pill = (container: HTMLElement) => container.firstElementChild as HTMLElement;
    const details = (container: HTMLElement) =>
      container.querySelector('[aria-hidden]:not([data-provider-logo])') as HTMLElement;

    it('when first shown, should be closed: just the icon, with the details out of reach', () => {
      const { container } = render(<AiInUse collapsible />);

      expect(
        screen.getByRole('button', { name: /Mostrar a IA em uso: Gemini · gemini-barato/ }),
      ).toBeInTheDocument();
      expect(details(container)).toHaveAttribute('aria-hidden', 'true');
      expect(details(container)).toHaveAttribute('inert');
      expect(
        screen.queryByRole('button', { name: 'Trocar a IA nesta sessão' }),
      ).not.toBeInTheDocument();
    });

    it('when closed, should use the standard small icon button', () => {
      const { container } = render(<AiInUse collapsible />);

      expect(iconButton()).toHaveClass('size-8');
      expect(container.querySelector('[data-provider-logo]')).toHaveClass('size-4');
    });

    it('when shown, should have the same gray border as the mind map and infographic controls, on a card with a shadow', () => {
      const { container } = render(<AiInUse collapsible />);

      expect(pill(container)).toHaveClass('border', 'bg-card', 'shadow-sm', 'rounded-lg');
      expect(pill(container).className).not.toMatch(/border-(primary|brand)/);
    });

    it('when the icon is clicked, should open the details to the right of the icon', async () => {
      const user = userEvent.setup();
      const { container } = render(<AiInUse collapsible />);

      await user.click(iconButton());

      expect(screen.getByText('Gemini · gemini-barato')).toBeInTheDocument();
      expect(iconButton()).toHaveAttribute('aria-expanded', 'true');
      expect(details(container)).toHaveAttribute('aria-hidden', 'false');
      expect(details(container)).not.toHaveAttribute('inert');
      expect(details(container)).toHaveClass('grid-cols-[1fr]');
      expect(pill(container).firstElementChild).toBe(iconButton());
      expect(pill(container).lastElementChild).toBe(details(container));
    });

    it('when open and the icon is clicked again, should close the details', async () => {
      const user = userEvent.setup();
      const { container } = render(<AiInUse collapsible />);
      await user.click(iconButton());

      await user.click(screen.getByRole('button', { name: 'Ocultar a IA em uso' }));

      expect(iconButton()).toHaveAttribute('aria-expanded', 'false');
      expect(details(container)).toHaveAttribute('aria-hidden', 'true');
      expect(details(container)).toHaveClass('grid-cols-[0fr]');
    });

    it('when opening and closing, should keep the same box so the height never changes', async () => {
      const user = userEvent.setup();
      const { container } = render(<AiInUse collapsible />);
      const closed = pill(container).className;

      await user.click(iconButton());

      expect(pill(container).className).toBe(closed);
      expect(pill(container).className).not.toMatch(/p-d|py-|h-d/);
    });

    it('when open, should still let the user switch the AI', async () => {
      window.localStorage.setItem('homelab.ai-in-use-expanded', '1');
      const user = userEvent.setup();
      render(<AiInUse collapsible />);

      await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('when it was opened before, should remember it the next time the app shows it', async () => {
      const user = userEvent.setup();
      const first = render(<AiInUse collapsible />);
      await user.click(iconButton());
      first.unmount();

      const { container } = render(<AiInUse collapsible />);

      expect(details(container)).toHaveAttribute('aria-hidden', 'false');
    });
  });

  it('when the switch is being saved, should disable cancelling', async () => {
    Object.assign(switchState, { isPending: true });
    const user = userEvent.setup();
    render(<AiInUse />);

    await user.click(screen.getByRole('button', { name: 'Trocar a IA nesta sessão' }));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
