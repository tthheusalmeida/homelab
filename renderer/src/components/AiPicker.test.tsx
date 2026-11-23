import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AiPicker, isAiPreferenceComplete } from './AiPicker';

vi.mock('../pages/ai/chat/hooks/useAiProviders', () => ({
  useAiProviders: () => ({
    data: [
      { id: 'ollama', label: 'Ollama' },
      { id: 'gemini', label: 'Gemini' },
      { id: 'anthropic', label: 'Anthropic' },
    ],
    isLoading: false,
  }),
}));
vi.mock('../pages/ai/chat/hooks/useAiModels', () => ({
  useAiModels: (providerId?: string) => ({
    data: providerId ? [{ id: `${providerId}-m1`, label: `${providerId} M1` }] : undefined,
    isLoading: false,
  }),
}));

// O select real é do Base UI; aqui basta um select nativo para escolher.
vi.mock('./OptionSelect', () => ({
  OptionSelect: ({
    label,
    options,
    value,
    disabled,
    onValueChange,
  }: {
    label: string;
    options: { id: string; label: string }[];
    value?: string;
    disabled?: boolean;
    onValueChange: (value: string | null) => void;
  }) => (
    <select
      aria-label={label}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value || null)}
    >
      <option value="">-</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const optionsOf = (name: string) =>
  [...screen.getByLabelText(name).querySelectorAll('option')].map((option) => option.textContent);

describe('isAiPreferenceComplete', () => {
  it('when the preference is automatic (null), should be complete', () => {
    expect(isAiPreferenceComplete(null)).toBe(true);
  });

  it('when a cloud service has no model (automatic model), should be complete', () => {
    expect(isAiPreferenceComplete({ providerId: 'anthropic', modelId: null })).toBe(true);
  });

  it('when the local service has no model, should be incomplete', () => {
    expect(isAiPreferenceComplete({ providerId: 'ollama', modelId: null })).toBe(false);
  });

  it('when the local service has a model, should be complete', () => {
    expect(isAiPreferenceComplete({ providerId: 'ollama', modelId: 'llama3' })).toBe(true);
  });
});

describe('AiPicker', () => {
  it('when automatic is allowed, should offer it first in the service list', () => {
    render(<AiPicker value={null} onChange={vi.fn()} allowAuto />);

    expect(optionsOf('Serviço')).toEqual(['-', 'Automática', 'Ollama', 'Gemini', 'Anthropic']);
  });

  it('when automatic is not allowed, should list only the services', () => {
    render(<AiPicker value={{ providerId: 'gemini', modelId: null }} onChange={vi.fn()} />);

    expect(optionsOf('Serviço')).toEqual(['-', 'Ollama', 'Gemini', 'Anthropic']);
  });

  it('when a cloud service is chosen, should offer the automatic cheapest model plus its models', () => {
    render(<AiPicker value={{ providerId: 'anthropic', modelId: null }} onChange={vi.fn()} />);

    expect(optionsOf('Modelo')).toEqual(['-', 'Mais barato (automático)', 'anthropic M1']);
    expect(screen.getByLabelText('Modelo')).toHaveValue('auto');
  });

  it('when the local service is chosen, should not offer an automatic model', () => {
    render(<AiPicker value={{ providerId: 'ollama', modelId: null }} onChange={vi.fn()} />);

    expect(optionsOf('Modelo')).toEqual(['-', 'ollama M1']);
  });

  it('when automatic is chosen, should disable the model list', () => {
    render(<AiPicker value={null} onChange={vi.fn()} allowAuto />);

    expect(screen.getByLabelText('Modelo')).toBeDisabled();
  });

  it('when another service is chosen, should answer it with no model yet', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AiPicker value={{ providerId: 'gemini', modelId: 'gemini-m1' }} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Serviço'), 'anthropic');

    expect(onChange).toHaveBeenCalledWith({ providerId: 'anthropic', modelId: null });
  });

  it('when automatic is chosen as the service, should answer null', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AiPicker value={{ providerId: 'gemini', modelId: null }} onChange={onChange} allowAuto />,
    );

    await user.selectOptions(screen.getByLabelText('Serviço'), 'auto');

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('when a model is chosen, should keep the service and answer the model', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AiPicker value={{ providerId: 'gemini', modelId: null }} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Modelo'), 'gemini-m1');

    expect(onChange).toHaveBeenCalledWith({ providerId: 'gemini', modelId: 'gemini-m1' });
  });

  it('when the cheapest model is chosen again, should answer a null model', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AiPicker value={{ providerId: 'gemini', modelId: 'gemini-m1' }} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Modelo'), 'auto');

    expect(onChange).toHaveBeenCalledWith({ providerId: 'gemini', modelId: null });
  });

  it('when disabled, should disable both lists', () => {
    render(
      <AiPicker value={{ providerId: 'gemini', modelId: null }} onChange={vi.fn()} disabled />,
    );

    expect(screen.getByLabelText('Serviço')).toBeDisabled();
    expect(screen.getByLabelText('Modelo')).toBeDisabled();
  });
});
