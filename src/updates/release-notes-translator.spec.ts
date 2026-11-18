import {
  ReleaseNotesTranslator,
  stripCodeFence,
  translationPrompt,
  TranslationUnavailableError,
  TranslatorMessages,
  type LocalAiPort,
  type LocalModelInfo,
} from './release-notes-translator';

const model = (name: string, size: number, capabilities = ['completion']): LocalModelInfo => ({
  name,
  size,
  capabilities,
});

function setup(models: LocalModelInfo[] | Error, answer = '## Novidades\n\n- Leitura mais rápida') {
  const ai = {
    models: jest.fn(async () => {
      if (models instanceof Error) {
        throw models;
      }

      return models;
    }),
    chat: jest.fn().mockResolvedValue(answer),
  } satisfies LocalAiPort;

  return { ai, translator: new ReleaseNotesTranslator(ai) };
}

const NOTES = '## Novidades\n\n- feat: faster reading';

describe('ReleaseNotesTranslator.available', () => {
  it('when Ollama answers with a text model, should be available', async () => {
    const { translator } = setup([model('llama3', 4_000)]);

    await expect(translator.available()).resolves.toBe(true);
  });

  it('when Ollama is off, should not be available (and never throw)', async () => {
    const { translator } = setup(new Error('ECONNREFUSED'));

    await expect(translator.available()).resolves.toBe(false);
  });

  it('when Ollama has no model installed, should not be available', async () => {
    const { translator } = setup([]);

    await expect(translator.available()).resolves.toBe(false);
  });

  it('when the only models are for embeddings, should not be available', async () => {
    const { translator } = setup([model('nomic-embed', 300, ['embedding'])]);

    await expect(translator.available()).resolves.toBe(false);
  });
});

describe('ReleaseNotesTranslator.translate', () => {
  it('when there are several models, should use the smallest one that writes text (the cheapest)', async () => {
    const { ai, translator } = setup([
      model('grande', 9_000),
      model('embeddings', 100, ['embedding']),
      model('pequeno', 1_000),
      model('medio', 4_000),
    ]);

    await translator.translate('0.3.0', NOTES);

    expect(ai.chat).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'ollama', modelId: 'pequeno', thinking: 'off' }),
    );
  });

  it('when translating, should send the notes inside the translation prompt', async () => {
    const { ai, translator } = setup([model('m', 1)]);

    await translator.translate('0.3.0', NOTES);

    expect(ai.chat.mock.calls[0][0].message).toBe(translationPrompt(NOTES));
    expect(translationPrompt(NOTES)).toContain('português do Brasil');
    expect(translationPrompt(NOTES)).toContain(NOTES);
  });

  it('when the model answers, should return the translated text', async () => {
    const { translator } = setup([model('m', 1)], '  ## Novidades\n\n- Leitura mais rápida  \n');

    await expect(translator.translate('0.3.0', NOTES)).resolves.toBe(
      '## Novidades\n\n- Leitura mais rápida',
    );
  });

  it('when the model wraps the answer in a markdown code block, should remove the fence', async () => {
    const { translator } = setup([model('m', 1)], '```markdown\n## Novidades\n```');

    await expect(translator.translate('0.3.0', NOTES)).resolves.toBe('## Novidades');
  });

  it('when the same version is translated again, should answer from memory without calling the model', async () => {
    const { ai, translator } = setup([model('m', 1)]);

    await translator.translate('0.3.0', NOTES);
    await translator.translate('0.3.0', NOTES);

    expect(ai.chat).toHaveBeenCalledTimes(1);
  });

  it('when another version is translated, should call the model again', async () => {
    const { ai, translator } = setup([model('m', 1)]);

    await translator.translate('0.3.0', NOTES);
    await translator.translate('0.4.0', NOTES);

    expect(ai.chat).toHaveBeenCalledTimes(2);
  });

  it('when Ollama is off, should refuse with the unavailable error and not call the model', async () => {
    const { ai, translator } = setup(new Error('ECONNREFUSED'));

    await expect(translator.translate('0.3.0', NOTES)).rejects.toBeInstanceOf(
      TranslationUnavailableError,
    );
    expect(ai.chat).not.toHaveBeenCalled();
  });

  it('when the model answers with nothing, should fail with the generic message and not cache it', async () => {
    const { ai, translator } = setup([model('m', 1)], '   ');

    await expect(translator.translate('0.3.0', NOTES)).rejects.toThrow(TranslatorMessages.failed);

    ai.chat.mockResolvedValueOnce('## Novidades');

    await expect(translator.translate('0.3.0', NOTES)).resolves.toBe('## Novidades');
  });

  it('when the model call fails, should let the error go up', async () => {
    const { ai, translator } = setup([model('m', 1)]);

    ai.chat.mockRejectedValueOnce(new Error('falhou'));

    await expect(translator.translate('0.3.0', NOTES)).rejects.toThrow('falhou');
  });
});

describe('stripCodeFence', () => {
  it('when there is no fence, should only trim', () => {
    expect(stripCodeFence('  texto  ')).toBe('texto');
  });
});
