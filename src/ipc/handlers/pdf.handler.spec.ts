import { IpcChannels } from '../../shared/channels';
import { IpcErrorCode } from '../../shared/errors';
import { PdfMessages, PdfProblem, PdfReadError } from '../../back/modules/pdf/pdf-read.error';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { PdfHandler, type PdfPort } from './pdf.handler';

type Fakes = Record<keyof PdfPort, jest.Mock>;

function setup(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    inspect: jest.fn().mockResolvedValue(null),
    cancel: jest.fn(),
    ...overrides,
  };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new PdfHandler(fakes)]);

  return { ipc, fakes };
}

describe('PdfHandler', () => {
  it('when pdf:inspect is called, should answer what the inspector read', async () => {
    const inspection = { token: 't', fileName: 'livro.pdf', pageCount: 3 };
    const { ipc } = setup({ inspect: jest.fn().mockResolvedValue(inspection) });

    await expect(ipc.invoke(IpcChannels.pdf.inspect)).resolves.toEqual({
      ok: true,
      data: inspection,
    });
  });

  it('when the user cancels the file dialog, should answer null', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.pdf.inspect)).resolves.toEqual({ ok: true, data: null });
  });

  it('when the file has a known problem, should answer VALIDATION with the user message', async () => {
    const { ipc } = setup({
      inspect: jest
        .fn()
        .mockRejectedValue(new PdfReadError(PdfProblem.ENCRYPTED, PdfMessages.encrypted)),
    });

    await expect(ipc.invoke(IpcChannels.pdf.inspect)).resolves.toEqual({
      ok: false,
      error: { code: IpcErrorCode.VALIDATION, message: PdfMessages.encrypted },
    });
  });

  it('when pdf:cancel is called, should ask the inspector to stop', async () => {
    const { ipc, fakes } = setup();

    await expect(ipc.invoke(IpcChannels.pdf.cancel)).resolves.toEqual({ ok: true });
    expect(fakes.cancel).toHaveBeenCalledTimes(1);
  });
});
