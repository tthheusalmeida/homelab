import { IpcDefaultMessages, IpcError, IpcErrorCode } from './errors';

describe('IpcError', () => {
  it('when created with a message, should keep code and message', () => {
    const error = new IpcError(IpcErrorCode.NOT_FOUND, 'Livro não encontrado');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Livro não encontrado');
    expect(error).toBeInstanceOf(Error);
  });

  it('when created without a message, should use the default message of the code', () => {
    expect(new IpcError(IpcErrorCode.VALIDATION).message).toBe(IpcDefaultMessages.VALIDATION);
  });

  it('when created with a blank message, should use the default message of the code', () => {
    expect(new IpcError(IpcErrorCode.INTERNAL, '   ').message).toBe(IpcDefaultMessages.INTERNAL);
  });

  it('when listing the defaults, should have a message for every code', () => {
    for (const code of Object.values(IpcErrorCode)) {
      expect(IpcDefaultMessages[code]).toBeTruthy();
    }
  });
});
