import type { PdfChunk } from '../back/modules/pdf/pdf-chunker';
import { PdfJobMessages } from '../back/modules/jobs/processors/pdf-to-summary/processor';
import { PdfJobPreparer, PdfPrepareMessages } from './pdf-job-preparer';
import { PdfSessionStore } from './pdf-session.store';

const pages = ['página um '.repeat(10), 'página dois '.repeat(10), '', 'página quatro '.repeat(10)];

const request = {
  token: '',
  providerId: 'gemini' as const,
  modelId: 'gemini-x',
  thinking: 'on',
  detail: 'study' as const,
};

function setup(chunk?: (pages: string[]) => PdfChunk[]) {
  const sessions = new PdfSessionStore();
  const token = sessions.put({
    filePath: 'D:/docs/Livro.pdf',
    fileName: 'Livro.pdf',
    extraction: {
      sizeBytes: 10,
      pageCount: 4,
      pages,
      emptyPages: 1,
      ocrPages: 0,
      ocrDiscardedPages: 0,
      languages: [],
      characters: 100,
    },
  });
  const checkpoints = {
    create: jest.fn().mockResolvedValue({}),
    load: jest.fn().mockResolvedValue({ key: 'k' }),
  };
  const preparer = new PdfJobPreparer({ sessions, checkpoints, chunk });

  return { preparer, sessions, checkpoints, token };
}

describe('PdfJobPreparer', () => {
  it('when preparing, should write the parts to disk before answering', async () => {
    const { preparer, checkpoints, token } = setup();

    const input = await preparer.prepare({ ...request, token });

    expect(checkpoints.create).toHaveBeenCalledTimes(1);

    const [key, info, chunks] = checkpoints.create.mock.calls[0];

    expect(key).toBe(input.checkpointKey);
    expect(info).toEqual({
      fileName: 'Livro.pdf',
      pageCount: 4,
      params: { providerId: 'gemini', modelId: 'gemini-x', detail: 'study', thinking: 'on' },
    });
    expect(chunks[0].text).toContain('página um');
  });

  it('when preparing, should answer the job data with the key and never the token or the path', async () => {
    const { preparer, token } = setup();

    const input = await preparer.prepare({
      ...request,
      token,
      title: 'Meu livro',
      category: ['Redes'],
      tags: ['estudo'],
    });

    expect(input).toEqual({
      checkpointKey: expect.stringMatching(/^[a-f0-9]{24}$/),
      fileName: 'Livro.pdf',
      providerId: 'gemini',
      modelId: 'gemini-x',
      detail: 'study',
      thinking: 'on',
      title: 'Meu livro',
      category: ['Redes'],
      tags: ['estudo'],
    });
    expect(JSON.stringify(input)).not.toContain(token);
    expect(JSON.stringify(input)).not.toContain('D:/docs');
  });

  it('when the detail is missing, should use the default level', async () => {
    const { preparer, token } = setup();

    const input = await preparer.prepare({ ...request, token, detail: undefined });

    expect(input.detail).toBe('detailed');
  });

  it('when the same pdf is prepared again with the same settings, should give the same key', async () => {
    const first = setup();
    const second = setup();

    const a = await first.preparer.prepare({ ...request, token: first.token });
    const b = await second.preparer.prepare({ ...request, token: second.token });

    expect(a.checkpointKey).toBe(b.checkpointKey);
  });

  it('when another model is chosen for the same text, should give the same key to continue the work', async () => {
    const first = setup();
    const second = setup();

    const a = await first.preparer.prepare({ ...request, token: first.token });
    const b = await second.preparer.prepare({ ...request, token: second.token, modelId: 'outro' });

    expect(a.checkpointKey).toBe(b.checkpointKey);
    expect(b.modelId).toBe('outro');
  });

  it('when another detail level is chosen, should give another key', async () => {
    const first = setup();
    const second = setup();

    const a = await first.preparer.prepare({ ...request, token: first.token });
    const b = await second.preparer.prepare({
      ...request,
      token: second.token,
      detail: 'brief',
    });

    expect(a.checkpointKey).not.toBe(b.checkpointKey);
  });

  it('when the text is saved, should free the reading from memory', async () => {
    const { preparer, sessions, token } = setup();

    await preparer.prepare({ ...request, token });

    expect(sessions.get(token)).toBeUndefined();
  });

  it('when the token is unknown, should refuse with a message to choose the file again', async () => {
    const { preparer, checkpoints } = setup();

    await expect(preparer.prepare({ ...request, token: 'nada' })).rejects.toThrow(
      PdfPrepareMessages.sessionExpired,
    );
    expect(checkpoints.create).not.toHaveBeenCalled();
  });

  it('when writing to disk fails, should pass the error on and keep the reading in memory', async () => {
    const { preparer, checkpoints, sessions, token } = setup();

    checkpoints.create.mockRejectedValue(new Error('disco cheio'));

    await expect(preparer.prepare({ ...request, token })).rejects.toThrow('disco cheio');
    expect(sessions.get(token)).toBeDefined();
  });

  it('when the progress is on disk, should accept it', async () => {
    const { preparer } = setup();

    await expect(preparer.assertProgressExists('a'.repeat(24))).resolves.toBeUndefined();
  });

  it('when the progress is gone, should say the text is no longer stored', async () => {
    const { preparer, checkpoints } = setup();

    checkpoints.load.mockResolvedValue(null);

    await expect(preparer.assertProgressExists('a'.repeat(24))).rejects.toThrow(
      PdfJobMessages.missingProgress,
    );
  });
});
