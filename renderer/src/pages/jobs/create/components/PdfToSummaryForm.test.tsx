import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { PdfInspection } from '#shared/contracts/pdf';

const readMutate = vi.fn();
const cancelRead = vi.fn();
const readState = {
  isPending: false,
  isError: false,
  error: null as Error | null,
  progress: null as { done: number; total: number } | null,
};
const thinkingState = { options: [{ id: 'off', label: 'Desativado' }] };
const createMutate = vi.fn();
const createState = { isPending: false, isError: false, error: null as Error | null };

vi.mock('../hooks/useInspectPdf', () => ({
  useInspectPdf: () => ({ mutate: readMutate, cancel: cancelRead, ...readState }),
}));
vi.mock('../hooks/useCreatePdfToSummary', () => ({
  useCreatePdfToSummary: () => ({ mutate: createMutate, ...createState }),
}));
vi.mock('../../../ai/chat/hooks/useAiProviders', () => ({
  useAiProviders: () => ({ data: [{ id: 'gemini', label: 'Gemini' }], isLoading: false }),
}));
vi.mock('../../../ai/chat/hooks/useAiModels', () => ({
  useAiModels: () => ({ data: [{ id: 'm1', label: 'Modelo 1' }], isLoading: false }),
}));
vi.mock('../../../ai/chat/hooks/useAiThinking', () => ({
  useAiThinking: () => ({ data: thinkingState.options, isLoading: false }),
}));
vi.mock('../../../library/hooks/useLibrary', () => ({
  useCategories: () => ({ data: [] }),
}));

// O select real é do Base UI; aqui basta um select nativo para escolher.
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

import { JobForm } from './JobForm';
import { PdfToSummaryForm } from './PdfToSummaryForm';

const inspection: PdfInspection = {
  token: 'tok-1',
  fileName: 'Livro de Redes.pdf',
  sizeBytes: 2_500_000,
  pageCount: 120,
  emptyPages: 3,
  characters: 240_000,
  estimatedTokens: 60_000,
  parts: 8,
  estimatedCalls: 9,
  warnings: [
    { code: 'IMAGES_IGNORED', level: 'info', message: 'Só o texto do PDF é lido.' },
    { code: 'LARGE_DOCUMENT', level: 'warning', message: 'Documento grande: vai demorar.' },
  ],
};

/** O `mutate` de mentira responde como a leitura responderia. */
const readReturns = (result: PdfInspection | null) =>
  readMutate.mockImplementation(
    (_: unknown, options: { onSuccess: (data: PdfInspection | null) => void }) =>
      options.onSuccess(result),
  );

async function chooseModel(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Provedor'), 'gemini');
  await user.selectOptions(screen.getByLabelText('Modelo'), 'm1');
  await user.selectOptions(screen.getByLabelText('Pensar'), 'off');
}

describe('PdfToSummaryForm', () => {
  beforeEach(() => {
    readMutate.mockReset();
    cancelRead.mockReset();
    createMutate.mockReset();
    thinkingState.options = [{ id: 'off', label: 'Desativado' }];
    Object.assign(readState, { isPending: false, isError: false, error: null, progress: null });
    Object.assign(createState, { isPending: false, isError: false, error: null });
  });

  it('when no file was chosen yet, should offer only the choose button and say that only pdf is accepted', () => {
    render(<PdfToSummaryForm />);

    expect(screen.getByRole('button', { name: 'Escolher PDF' })).toBeEnabled();
    expect(screen.getByText(/só arquivos pdf são aceitos/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Provedor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar resumo do PDF' })).toBeDisabled();
  });

  it('when choosing the file, should ask the main process to read it', async () => {
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    expect(readMutate).toHaveBeenCalledTimes(1);
  });

  it('when the file was read, should show its numbers and every warning', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    expect(screen.getByText('Livro de Redes.pdf')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('8 partes')).toBeInTheDocument();
    expect(screen.getByText(/~60\.000 tokens/)).toBeInTheDocument();
    expect(screen.getByText('Só o texto do PDF é lido.')).toBeInTheDocument();
    expect(screen.getByText('Documento grande: vai demorar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher outro PDF' })).toBeInTheDocument();
  });

  it('when the user cancels the dialog, should keep the form without a file', async () => {
    readReturns(null);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    expect(screen.queryByText('Livro de Redes.pdf')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher PDF' })).toBeInTheDocument();
  });

  it('when a second pdf is chosen, should replace the first one', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);
    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    readReturns({ ...inspection, token: 'tok-2', fileName: 'Outro.pdf' });
    await user.click(screen.getByRole('button', { name: 'Escolher outro PDF' }));

    expect(screen.getByText('Outro.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Livro de Redes.pdf')).not.toBeInTheDocument();
  });

  it('when the file is read but no model was chosen, should keep the submit disabled', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    expect(screen.getByRole('button', { name: 'Criar resumo do PDF' })).toBeDisabled();
  });

  it('when Gemini is chosen, should warn that the text will be sent to an external service', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    expect(screen.getByText(/escolha o serviço de ia/i)).toBeInTheDocument();

    await chooseModel(user);

    expect(screen.getByText(/enviado ao gemini, um serviço externo/i)).toBeInTheDocument();
  });

  it('when everything is chosen, should explain that progress is saved and can be resumed', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));

    expect(screen.getByText(/progresso fica salvo em disco/i)).toBeInTheDocument();
  });

  it('when submitting, should send the token, the model, the detail and the document hints', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));
    await chooseModel(user);
    await user.type(screen.getByLabelText('Título'), 'Redes de computadores');
    await user.click(screen.getByRole('button', { name: 'Criar resumo do PDF' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toEqual({
      token: 'tok-1',
      providerId: 'gemini',
      modelId: 'm1',
      thinking: 'off',
      detail: 'detailed',
      title: 'Redes de computadores',
    });
  });

  it('when the model has no thinking options, should hide the selector and still allow creating', async () => {
    thinkingState.options = [];
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));
    await user.selectOptions(screen.getByLabelText('Provedor'), 'gemini');
    await user.selectOptions(screen.getByLabelText('Modelo'), 'm1');

    expect(screen.queryByLabelText('Pensar')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar resumo do PDF' }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0][0]).toMatchObject({ providerId: 'gemini', modelId: 'm1' });
    expect(createMutate.mock.calls[0][0].thinking).toBeUndefined();
  });

  it('when the title is empty, should send no title so the file name is used', async () => {
    readReturns(inspection);
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));
    await chooseModel(user);
    await user.click(screen.getByRole('button', { name: 'Criar resumo do PDF' }));

    expect(createMutate.mock.calls[0][0]).not.toHaveProperty('title');
  });

  it('when the job is created, should report it and lock the form so it is not created twice', async () => {
    readReturns(inspection);
    createMutate.mockImplementation((_: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<PdfToSummaryForm onCreated={onCreated} />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));
    await chooseModel(user);
    await user.click(screen.getByRole('button', { name: 'Criar resumo do PDF' }));

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Criar resumo do PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escolher outro PDF' })).toBeDisabled();
  });

  it('when the creation fails, should not report it and keep the form usable', async () => {
    readReturns(inspection);
    createMutate.mockImplementation(() => {});
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(<PdfToSummaryForm onCreated={onCreated} />);

    await user.click(screen.getByRole('button', { name: 'Escolher PDF' }));
    await chooseModel(user);
    await user.click(screen.getByRole('button', { name: 'Criar resumo do PDF' }));

    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Criar resumo do PDF' })).toBeEnabled();
  });

  it('when the reading is in progress, should show the pages read and a cancel button instead of the choose button', async () => {
    readState.isPending = true;
    readState.progress = { done: 12, total: 120 };
    const user = userEvent.setup();
    render(<PdfToSummaryForm />);

    expect(screen.getByText('Lendo página 12 de 120')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
    expect(screen.queryByRole('button', { name: 'Escolher PDF' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar leitura' }));

    expect(cancelRead).toHaveBeenCalledTimes(1);
  });

  it('when the reading has not started counting pages, should say the file is being opened', () => {
    readState.isPending = true;
    readState.progress = { done: 0, total: 0 };
    render(<PdfToSummaryForm />);

    expect(screen.getByText('Abrindo o arquivo…')).toBeInTheDocument();
  });
});

describe('JobForm: resumo de PDF', () => {
  beforeEach(() => {
    Object.assign(readState, { isPending: false, isError: false, error: null, progress: null });
  });

  it('when the job type is pdf-to-summary, should render the pdf form', () => {
    render(
      <JobForm jobType={{ type: 'pdf-to-summary', label: 'Resumo de PDF', description: '' }} />,
    );

    expect(screen.getByRole('button', { name: 'Escolher PDF' })).toBeInTheDocument();
  });
});
