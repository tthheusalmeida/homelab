import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChatSettings } from './ChatSettings';

// O select real é do Base UI; aqui basta um select nativo para achar cada seletor.
vi.mock('#components/OptionSelect', () => ({
  OptionSelect: ({ label, disabled }: { label: string; disabled?: boolean }) => (
    <select aria-label={label} disabled={disabled} />
  ),
}));

const baseProps = {
  providers: [{ id: 'anthropic', label: 'Anthropic' }],
  models: [{ id: 'm1', label: 'M1', providerId: 'anthropic' }],
  thinkingOptions: [] as { id: string; label: string }[],
  providerId: 'anthropic',
  modelId: 'm1',
  onProviderChange: vi.fn(),
  onModelChange: vi.fn(),
  onThinkingChange: vi.fn(),
};

describe('ChatSettings', () => {
  it('when the model has thinking options, should show the Pensar selector', () => {
    render(<ChatSettings {...baseProps} thinkingOptions={[{ id: 'on', label: 'Ativado' }]} />);

    expect(screen.getByRole('combobox', { name: 'Pensar' })).toBeInTheDocument();
  });

  it('when the model has no thinking options, should hide the Pensar selector', () => {
    render(<ChatSettings {...baseProps} />);

    expect(screen.queryByRole('combobox', { name: 'Pensar' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Modelo' })).toBeInTheDocument();
  });

  it('when no model is chosen yet, should still show the Pensar selector disabled', () => {
    render(<ChatSettings {...baseProps} modelId={undefined} />);

    expect(screen.getByRole('combobox', { name: 'Pensar' })).toBeDisabled();
  });

  it('when the options are still loading, should show the selector', () => {
    render(<ChatSettings {...baseProps} isLoadingThinking />);

    expect(screen.getByRole('combobox', { name: 'Pensar' })).toBeInTheDocument();
  });
});
