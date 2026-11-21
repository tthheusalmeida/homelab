import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { cancelPdfRead, createPdfToSummary, inspectPdf } from './pdf';

describe('pdf api', () => {
  it('when inspecting, should ask the main process and answer what was read', async () => {
    const inspection = { token: 't', fileName: 'a.pdf' };
    const invoke = mockApi({ [IpcChannels.pdf.inspect]: () => ok(inspection) });

    await expect(inspectPdf()).resolves.toEqual(inspection);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.pdf.inspect);
  });

  it('when the user cancels the dialog, should answer null', async () => {
    mockApi({ [IpcChannels.pdf.inspect]: () => ok(null) });

    await expect(inspectPdf()).resolves.toBeNull();
  });

  it('when the file cannot be read, should throw the message for the user', async () => {
    mockApi({
      [IpcChannels.pdf.inspect]: () => failure('VALIDATION', 'Este PDF é protegido por senha.'),
    });

    await expect(inspectPdf()).rejects.toThrow('Este PDF é protegido por senha.');
  });

  it('when cancelling the reading, should call the cancel channel', async () => {
    const invoke = mockApi({ [IpcChannels.pdf.cancel]: () => ok(undefined) });

    await cancelPdfRead();

    expect(invoke).toHaveBeenCalledWith(IpcChannels.pdf.cancel);
  });

  it('when creating the job, should send the token and the choices and answer id and status', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.createPdfToSummary]: () => ok({ id: 'j1', status: 'pending' }),
    });
    const params = {
      token: 't',
      providerId: 'gemini' as const,
      modelId: 'm',
      thinking: 'off',
      detail: 'detailed' as const,
    };

    await expect(createPdfToSummary(params)).resolves.toEqual({ id: 'j1', status: 'pending' });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.createPdfToSummary, params);
  });

  it('when the reading expired, should throw the message', async () => {
    mockApi({
      [IpcChannels.jobs.createPdfToSummary]: () =>
        failure('VALIDATION', 'A leitura deste PDF não está mais disponível.'),
    });

    await expect(
      createPdfToSummary({ token: 'x', providerId: 'gemini', modelId: 'm' }),
    ).rejects.toThrow('não está mais disponível');
  });
});
