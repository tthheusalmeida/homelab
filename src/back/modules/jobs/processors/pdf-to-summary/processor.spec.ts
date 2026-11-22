import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { AIService } from '../../../ai/ai.service';
import { buildSummaryPrompt } from '../../../ai/prompts/summary-specialist.prompt';
import { parseDocument } from '../../../library/domain/frontmatter';
import type { PdfChunk } from '../../../pdf/pdf-chunker';
import { checkpointKey, PdfCheckpointStore } from '../../../pdf/pdf-checkpoint.store';
import type { LibraryClassifier } from '../../../library/application/library-classifier';
import type { VideoService } from '../../../video/video.service';
import { Job } from '../../domain/job.entity';
import { JobStatus } from '../../domain/job-status.enum';

import type { PdfToSummaryDto } from './dto/pdf-to-summary.dto';
import { PdfJobMessages, PdfToSummaryJobProcessor, titleFromFileName } from './processor';

const chunks: PdfChunk[] = [
  { index: 0, startPage: 1, endPage: 2, text: 'texto um' },
  { index: 1, startPage: 3, endPage: 4, text: 'texto dois' },
  { index: 2, startPage: 5, endPage: 5, text: 'texto três' },
];

const params = { providerId: 'ollama', modelId: 'qwen', detail: 'detailed' };

describe('titleFromFileName', () => {
  it.each([
    ['Livro de Redes.pdf', 'Livro de Redes'],
    ['relatorio.PDF', 'relatorio'],
    ['sem-extensao', 'sem-extensao'],
    ['.pdf', 'Resumo de PDF'],
  ])('when the file is %s, should title it %s', (name, title) => {
    expect(titleFromFileName(name)).toBe(title);
  });
});

describe('PdfToSummaryJobProcessor', () => {
  let dir: string;
  let store: PdfCheckpointStore;
  let key: string;
  let ai: { chat: jest.Mock };
  let video: { saveFile: jest.Mock };
  let classifier: { classify: jest.Mock };
  let processor: PdfToSummaryJobProcessor;
  let job: Job;
  let dto: PdfToSummaryDto;

  const prompts = (): string[] => ai.chat.mock.calls.map(([request]) => request.message as string);

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-job-'));
    store = new PdfCheckpointStore(dir);
    key = checkpointKey(chunks, params);
    await store.create(key, { fileName: 'Livro.pdf', pageCount: 5, params }, chunks);

    ai = {
      chat: jest.fn(async ({ message }: { message: string }) => {
        const part = /texto (um|dois|três)/.exec(message)?.[1];

        return `## Seção ${part}\n\nresumo ${part}`;
      }),
    };
    video = { saveFile: jest.fn().mockResolvedValue('/inbox/out.md') };
    classifier = {
      classify: jest.fn().mockResolvedValue({
        title: 'Redes de Computadores',
        category: ['Tecnologia', 'Redes'],
        tags: ['redes', 'tcp'],
        model: 'qwen',
      }),
    };
    processor = new PdfToSummaryJobProcessor(
      ai as unknown as AIService,
      video as unknown as VideoService,
      store,
      classifier as unknown as LibraryClassifier,
    );
    job = new Job('pdf-to-summary');
    dto = {
      checkpointKey: key,
      fileName: 'Livro.pdf',
      providerId: 'ollama',
      modelId: 'qwen',
      thinking: 'on',
      detail: 'detailed',
    };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('when the user has custom instructions, should send them in every part', async () => {
    const withPrompts = new PdfToSummaryJobProcessor(
      ai as unknown as AIService,
      video as unknown as VideoService,
      store,
      classifier as unknown as LibraryClassifier,
      {
        instructionsFor: jest.fn().mockReturnValue('Resuma em tópicos curtos para a prova.'),
      } as never,
    );

    await withPrompts.process(job, dto);

    const messages = (ai.chat.mock.calls as Array<[{ message: string }]>).map(
      ([call]) => call.message,
    );

    expect(messages).toHaveLength(3);

    for (const message of messages) {
      expect(message).toContain('Resuma em tópicos curtos para a prova.');
      expect(message).toContain('# REGRAS FIXAS DO APLICATIVO');
    }
  });

  it('when processing, should summarize each part in order using the chosen model', async () => {
    await processor.process(job, dto);

    expect(ai.chat).toHaveBeenCalledTimes(3);
    expect(ai.chat.mock.calls[0][0]).toMatchObject({
      providerId: 'ollama',
      modelId: 'qwen',
      thinking: 'on',
    });
    expect(prompts()[0]).toContain('texto um');
    expect(prompts()[2]).toContain('texto três');
  });

  it('when processing, should ask for the summary with the prompt of the chosen detail level', async () => {
    await processor.process(job, { ...dto, detail: 'study' });

    expect(prompts()[0]).toContain(buildSummaryPrompt('study'));
  });

  it.each([
    ['missing', undefined],
    ['invalid', 'xyz' as PdfToSummaryDto['detail']],
  ])('when the detail is %s, should use the default level', async (_name, detail) => {
    await processor.process(job, { ...dto, detail });

    expect(prompts()[0]).toContain(buildSummaryPrompt('detailed'));
  });

  it('when processing, should tell the model which part and pages it is reading', async () => {
    await processor.process(job, dto);

    expect(prompts()[0]).toContain('parte 1 de 3');
    expect(prompts()[0]).toContain('páginas 1 a 2');
    expect(prompts()[2]).toContain('página 5');
  });

  it('when a later part is summarized, should tell the model which sections were already covered', async () => {
    await processor.process(job, dto);

    expect(prompts()[1]).toContain('Seções já resumidas');
    expect(prompts()[1]).toContain('Seção um');
    expect(prompts()[1]).toContain('Não repita o título principal');
    expect(prompts()[0]).not.toContain('Seções já resumidas');
  });

  it('when the document has a single part, should not mention parts', async () => {
    const single: PdfChunk[] = [{ index: 0, startPage: 1, endPage: 1, text: 'texto um' }];
    const singleKey = checkpointKey(single, params);

    await store.create(singleKey, { fileName: 'a.pdf', pageCount: 1, params }, single);
    await processor.process(job, { ...dto, checkpointKey: singleKey });

    expect(prompts()[0]).not.toContain('parte 1 de');
  });

  it('when each part is done, should save its summary to disk right away', async () => {
    let savedBeforeSecondCall: string | null = null;

    ai.chat.mockImplementation(async ({ message }: { message: string }) => {
      if (message.includes('texto dois')) {
        savedBeforeSecondCall = await store.readSummary(key, 0);
      }

      return `## S\n\nresumo de ${message.includes('texto um') ? 'um' : 'outro'}`;
    });

    await processor.process(job, dto);

    expect(savedBeforeSecondCall).toContain('resumo de um');
  });

  it('when all parts are done, should save one pending pdf document in the inbox with all summaries', async () => {
    await processor.process(job, dto);

    const [content, baseName, extension] = video.saveFile.mock.calls[0];
    const { meta, body } = parseDocument(content);

    expect(extension).toBe('.md');
    expect(baseName).toContain(job.id);
    expect(meta).toMatchObject({
      id: job.id,
      title: 'Redes de Computadores',
      category: ['Tecnologia', 'Redes'],
      tags: ['redes', 'tcp'],
      type: 'summary',
      source: 'pdf',
      status: 'pending',
    });
    expect(body).toContain('resumo um');
    expect(body.indexOf('resumo um')).toBeLessThan(body.indexOf('resumo dois'));
    expect(body.indexOf('resumo dois')).toBeLessThan(body.indexOf('resumo três'));
  });

  it('when the user gave title, category and tags, should use them on the document', async () => {
    job = new Job('pdf-to-summary', { title: 'Meu Livro', category: ['Redes'], tags: ['Estudo'] });

    await processor.process(job, dto);

    const { meta } = parseDocument(video.saveFile.mock.calls[0][0]);

    expect(meta).toMatchObject({ title: 'Meu Livro', category: ['Redes'], tags: ['estudo'] });
  });

  it('when everything succeeds, should run the five steps and delete the progress folder', async () => {
    await processor.process(job, dto);

    expect(job.steps.map((step) => [step.name, step.status])).toEqual([
      ['read-pdf', JobStatus.COMPLETED],
      ['summarize-parts', JobStatus.COMPLETED],
      ['fill-page', JobStatus.COMPLETED],
      ['save-file', JobStatus.COMPLETED],
      ['clean-up', JobStatus.COMPLETED],
    ]);
    expect(fs.existsSync(path.join(dir, key))).toBe(false);
  });

  it('when a part fails, should keep the parts already done and explain how to continue', async () => {
    ai.chat
      .mockResolvedValueOnce('## S1\n\nok 1')
      .mockResolvedValueOnce('## S2\n\nok 2')
      .mockRejectedValueOnce(new Error('limite de uso atingido'));

    const error = await processor.process(job, dto).catch((e: Error) => e);

    expect((error as Error).message).toBe(
      PdfJobMessages.partFailed(3, 3, 2, 'limite de uso atingido'),
    );
    expect((error as Error).message).toContain('Tentar de novo');
    await expect(store.progress(key)).resolves.toEqual({ done: 2, total: 3 });
    expect(video.saveFile).not.toHaveBeenCalled();
    expect(job.steps.find((s) => s.name === 'summarize-parts')?.status).toBe(JobStatus.FAILED);
  });

  it('when running again after a failure, should not call the AI for parts already done', async () => {
    ai.chat
      .mockResolvedValueOnce('## S1\n\nok 1')
      .mockRejectedValueOnce(new Error('serviço ocupado'));

    await processor.process(job, dto).catch(() => undefined);
    ai.chat.mockClear();

    await processor.process(new Job('pdf-to-summary'), dto);

    expect(ai.chat).toHaveBeenCalledTimes(2);
    expect(prompts()[0]).toContain('texto dois');
    expect(prompts()[1]).toContain('texto três');

    const { body } = parseDocument(video.saveFile.mock.calls[0][0]);

    expect(body).toContain('ok 1');
  });

  it('when resuming, should show in the job note how many parts were already done', async () => {
    await store.saveSummary(key, 0, '## S1\n\nok 1');
    const notes: Array<string | undefined> = [];

    ai.chat.mockImplementation(async () => {
      notes.push(job.note);

      return '## S\n\nx';
    });

    await processor.process(job, dto);

    expect(notes[0]).toBe('Resumindo a parte 2 de 3 (retomado: 1 já estavam prontas)');
  });

  it('when the AI retries, should show the attempt together with the part in the job note', async () => {
    let note: string | undefined;

    ai.chat.mockImplementationOnce(async (request: { onRetry: (info: unknown) => void }) => {
      request.onRetry({ attempt: 2, maxAttempts: 3, reason: 'serviço sobrecarregado' });
      note = job.note;

      return '## S\n\nx';
    });

    await processor.process(job, dto);

    expect(note).toBe(
      'Resumindo a parte 1 de 3 — Tentando de novo (tentativa 2 de 3): serviço sobrecarregado',
    );
  });

  it('when the user cancels, should stop before the next part and keep what is done', async () => {
    ai.chat.mockImplementationOnce(async () => {
      job.requestCancel();

      return '## S1\n\nok 1';
    });

    await expect(processor.process(job, dto)).rejects.toThrow('Cancelado pelo usuário');

    expect(ai.chat).toHaveBeenCalledTimes(1);
    await expect(store.progress(key)).resolves.toEqual({ done: 1, total: 3 });
    expect(fs.existsSync(path.join(dir, key))).toBe(true);
  });

  it('when the progress folder is gone, should fail on the first step with a clear message', async () => {
    await store.remove(key);

    await expect(processor.process(job, dto)).rejects.toThrow(PdfJobMessages.missingProgress);

    expect(ai.chat).not.toHaveBeenCalled();
    expect(job.steps[0].status).toBe(JobStatus.FAILED);
  });

  it('when saving the document fails, should keep the progress so nothing is lost', async () => {
    video.saveFile.mockRejectedValue(new Error('disco cheio'));

    await expect(processor.process(job, dto)).rejects.toThrow('disco cheio');

    await expect(store.progress(key)).resolves.toEqual({ done: 3, total: 3 });
  });

  it('when saving works after a failed save, should not call the AI again', async () => {
    video.saveFile.mockRejectedValueOnce(new Error('disco cheio'));

    await processor.process(job, dto).catch(() => undefined);
    ai.chat.mockClear();

    await processor.process(new Job('pdf-to-summary'), dto);

    expect(ai.chat).not.toHaveBeenCalled();
    expect(video.saveFile).toHaveBeenCalledTimes(2);
  });

  describe('passada final: título, categoria e tags', () => {
    const lastCall = () => classifier.classify.mock.calls[0][0];

    it('when the user gave nothing, should ask the AI once with the chosen model and the file title', async () => {
      await processor.process(job, dto);

      expect(classifier.classify).toHaveBeenCalledTimes(1);
      expect(lastCall()).toMatchObject({
        title: 'Livro',
        providerId: 'ollama',
        modelId: 'qwen',
        thinking: 'on',
      });
    });

    it('when classifying, should send a sample of the summaries and not more than the limit', async () => {
      await processor.process(job, dto);

      expect(lastCall().content).toContain('resumo um');
      expect(lastCall().content).toContain('resumo três');
      expect(lastCall().content.length).toBeLessThanOrEqual(12_000);
    });

    it('when the summaries are huge, should still represent every part in the sample', async () => {
      ai.chat.mockImplementation(async ({ message }: { message: string }) => {
        const part = /texto (um|dois|três)/.exec(message)?.[1];

        return `## Seção ${part}\n\n${`marca-${part} `.repeat(3000)}`;
      });

      await processor.process(job, dto);

      expect(lastCall().content).toContain('marca-um');
      expect(lastCall().content).toContain('marca-dois');
      expect(lastCall().content).toContain('marca-três');
    });

    it('when the user gave only the title, should keep it and let the AI fill the rest', async () => {
      job = new Job('pdf-to-summary', { title: 'Meu Livro' });

      await processor.process(job, dto);

      const { meta } = parseDocument(video.saveFile.mock.calls[0][0]);

      expect(lastCall().title).toBe('Meu Livro');
      expect(meta).toMatchObject({
        title: 'Meu Livro',
        category: ['Tecnologia', 'Redes'],
        tags: ['redes', 'tcp'],
      });
    });

    it('when the user gave only the tags, should keep them and let the AI fill title and category', async () => {
      job = new Job('pdf-to-summary', { tags: ['Estudo'] });

      await processor.process(job, dto);

      const { meta } = parseDocument(video.saveFile.mock.calls[0][0]);

      expect(meta).toMatchObject({
        title: 'Redes de Computadores',
        category: ['Tecnologia', 'Redes'],
        tags: ['estudo'],
      });
    });

    it('when the user gave title, category and tags, should not call the AI at all', async () => {
      job = new Job('pdf-to-summary', {
        title: 'Meu Livro',
        category: ['Redes'],
        tags: ['Estudo'],
      });

      await processor.process(job, dto);

      expect(classifier.classify).not.toHaveBeenCalled();
    });

    it('when the AI answers an empty title, should fall back to the file name', async () => {
      classifier.classify.mockResolvedValue({
        title: '',
        category: ['Redes'],
        tags: ['redes'],
        model: 'qwen',
      });

      await processor.process(job, dto);

      expect(parseDocument(video.saveFile.mock.calls[0][0]).meta.title).toBe('Livro');
    });

    it('when the AI fails, should fail the job with a message saying the summaries are saved', async () => {
      classifier.classify.mockRejectedValue(new Error('limite de uso atingido'));

      const error = await processor.process(job, dto).catch((e: Error) => e);

      expect((error as Error).message).toBe(PdfJobMessages.fillFailed('limite de uso atingido'));
      expect((error as Error).message).toContain('Tentar de novo');
      expect(job.steps.find((s) => s.name === 'fill-page')?.status).toBe(JobStatus.FAILED);
      expect(video.saveFile).not.toHaveBeenCalled();
      await expect(store.progress(key)).resolves.toEqual({ done: 3, total: 3 });
    });

    it('when retrying after the AI failed, should not summarize the parts again', async () => {
      classifier.classify.mockRejectedValueOnce(new Error('serviço ocupado'));

      await processor.process(job, dto).catch(() => undefined);
      ai.chat.mockClear();

      await processor.process(new Job('pdf-to-summary'), dto);

      expect(ai.chat).not.toHaveBeenCalled();
      expect(classifier.classify).toHaveBeenCalledTimes(2);
      expect(video.saveFile).toHaveBeenCalledTimes(1);
    });

    it('when the AI answer was saved and the document failed to save, should not ask the AI again', async () => {
      video.saveFile.mockRejectedValueOnce(new Error('disco cheio'));

      await processor.process(job, dto).catch(() => undefined);
      await processor.process(new Job('pdf-to-summary'), dto);

      expect(classifier.classify).toHaveBeenCalledTimes(1);
      expect(parseDocument(video.saveFile.mock.calls[1][0]).meta.title).toBe(
        'Redes de Computadores',
      );
    });

    it('when the AI retries, should show it in the job note', async () => {
      let note: string | undefined;

      classifier.classify.mockImplementation(
        async (request: { onRetry: (info: unknown) => void }) => {
          request.onRetry({ attempt: 2, maxAttempts: 3, reason: 'serviço sobrecarregado' });
          note = job.note;

          return { title: 'T', category: ['C'], tags: ['t'], model: 'qwen' };
        },
      );

      await processor.process(job, dto);

      expect(note).toBe(
        'Preenchendo título, categoria e tags — Tentando de novo (tentativa 2 de 3): serviço sobrecarregado',
      );
    });

    it('when the user cancels before this step, should not call the AI', async () => {
      ai.chat.mockImplementation(async () => {
        job.requestCancel();

        return '## S\n\nx';
      });

      await expect(processor.process(job, dto)).rejects.toThrow('Cancelado pelo usuário');

      expect(classifier.classify).not.toHaveBeenCalled();
    });
  });
});
