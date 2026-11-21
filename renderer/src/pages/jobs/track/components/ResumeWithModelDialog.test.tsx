import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../ai/chat/hooks/useAiProviders', () => ({
  useAiProviders: () => ({
    data: [{ id: 'ollama', label: 'Ollama' }],
    isLoading: false,
  }),
}));
vi.mock('../../../ai/chat/hooks/useAiModels', () => ({
  useAiModels: () => ({ data: [{ id: 'qwen', label: 'Qwen' }], isLoading: false }),
}));
vi.mock('../../../ai/chat/hooks/useAiThinking', () => ({
  useAiThinking: () => ({ data: [{ id: 'off', label: 'Desativado' }], isLoading: false }),
}));
vi.mock('#components/OptionSelect', () => ({
  OptionSelect: ({
    placeholder,
    options,
    value,
    disabled,
    onValueChange,
  }: {
    placeholder: string;
    options: { id: string; label: string }[];
    value?: string;
    disabled?: boolean;
    onValueChange: (value: string | null) => void;
  }) => (
    <select
      aria-label={placeholder}
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

import type { Job } from '../../types/job.types';

import { ResumeWithModelDialog } from './ResumeWithModelDialog';

const job: Job = {
  id: 'j1',
  name: 'pdf-to-summary',
  label: 'Resumo de PDF',
  status: 'failed',
  createdAt: '2026-01-01T10:00:00.000Z',
  completedAt: '',
  retryable: true,
  resume: { done: 3, total: 8 },
  steps: [],
};

describe('ResumeWithModelDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('when there is no job, should render nothing', () => {
    render(<ResumeWithModelDialog job={null} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('when open, should say how many parts are ready and will not be redone', () => {
    render(<ResumeWithModelDialog job={job} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

    expect(
      screen.getByText(/3 de 8 partes já estão prontas e não serão refeitas/),
    ).toBeInTheDocument();
  });

  it('when no model was chosen, should keep the confirm button disabled', () => {
    render(<ResumeWithModelDialog job={job} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('when a model is chosen and confirmed, should hand the job and the model to the caller', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ResumeWithModelDialog job={job} onOpenChange={vi.fn()} onConfirm={onConfirm} />);

    await user.selectOptions(screen.getByLabelText('Provedor'), 'ollama');
    await user.selectOptions(screen.getByLabelText('Modelo'), 'qwen');
    await user.selectOptions(screen.getByLabelText('Thinking'), 'off');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(onConfirm).toHaveBeenCalledWith(job, {
      providerId: 'ollama',
      modelId: 'qwen',
      thinking: 'off',
    });
  });

  it('when cancelling, should ask to close without confirming', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ResumeWithModelDialog job={job} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('when the request is running, should lock the choices', () => {
    render(
      <ResumeWithModelDialog job={job} isPending onOpenChange={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.getByLabelText('Provedor')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
