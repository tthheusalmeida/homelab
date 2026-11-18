import { describeOllamaError, OllamaErrorMessages } from './ollama-errors';

const axiosError = (code?: string, status?: number, data?: unknown) =>
  Object.assign(new Error('falhou'), { code, response: status ? { status, data } : undefined });

describe('describeOllamaError', () => {
  it.each(['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN'])(
    'when the connection fails with %s, should say Ollama could not be reached',
    (code) => {
      expect(describeOllamaError(axiosError(code))).toBe(OllamaErrorMessages.unreachable);
    },
  );

  it.each(['ETIMEDOUT', 'ECONNABORTED'])(
    'when it times out with %s, should say it took too long',
    (code) => {
      expect(describeOllamaError(axiosError(code))).toBe(OllamaErrorMessages.timeout);
    },
  );

  it('when the server answers 404, should say the model is not installed', () => {
    expect(describeOllamaError(axiosError(undefined, 404, { error: 'x' }))).toBe(
      OllamaErrorMessages.modelNotFound,
    );
  });

  it('when the server says the model was not found, should say the model is not installed', () => {
    expect(
      describeOllamaError(
        axiosError(undefined, 500, { error: 'model "x" not found, try pulling it first' }),
      ),
    ).toBe(OllamaErrorMessages.modelNotFound);
  });

  it('when the server says there is not enough memory, should suggest a smaller model', () => {
    expect(
      describeOllamaError(
        axiosError(undefined, 500, {
          error: 'model requires more system memory (9.0 GiB) than is available',
        }),
      ),
    ).toBe(OllamaErrorMessages.outOfMemory);
  });

  it('when the error body is plain text about memory, should still suggest a smaller model', () => {
    expect(describeOllamaError(axiosError(undefined, 500, 'out of memory'))).toBe(
      OllamaErrorMessages.outOfMemory,
    );
  });

  it('when the cause is unknown or not an object, should keep the generic message', () => {
    expect(describeOllamaError(new Error('x'))).toBe(OllamaErrorMessages.unknown);
    expect(describeOllamaError(undefined)).toBe(OllamaErrorMessages.unknown);
    expect(describeOllamaError('texto')).toBe(OllamaErrorMessages.unknown);
  });
});
