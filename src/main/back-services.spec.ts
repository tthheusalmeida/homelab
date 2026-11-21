import { AIService } from '../back/modules/ai/ai.service';
import { AiUsageService } from '../back/modules/ai/usage/ai-usage.service';
import { ChatService } from '../back/modules/chat/chat.service';
import { HealthAIService } from '../back/modules/health/ai/health-ai.service';
import { HealthSystemService } from '../back/modules/health/system/health-system.service';
import { JobRunner } from '../back/modules/jobs/application/job-runner.service';
import { JobService } from '../back/modules/jobs/application/job.service';
import { VideoToSummaryJobProcessor } from '../back/modules/jobs/processors/video-to-resume/processor';
import { VideoToTranscriptJobProcessor } from '../back/modules/jobs/processors/video-to-transcript/processor';
import { BookService } from '../back/modules/library/application/book.service';
import { LibraryClassifier } from '../back/modules/library/application/library-classifier';
import { LibraryService } from '../back/modules/library/application/library.service';

import { BackServices, type ServiceResolver } from './back-services';

/** Contêiner falso: uma instância por classe, e registro de quem foi pedido. */
function setup() {
  const instances = new Map<unknown, unknown>();
  const asked: unknown[] = [];
  const resolve = jest.fn((token: unknown) => {
    asked.push(token);

    return instances.get(token);
  });

  return { instances, asked, resolve, services: new BackServices(resolve as ServiceResolver) };
}

describe('BackServices', () => {
  it('when building the readers, should give each handler port the matching service instance', () => {
    const { instances, services } = setup();
    const pairs: [string, unknown][] = [
      ['healthSystem', HealthSystemService],
      ['healthAi', HealthAIService],
      ['ai', AIService],
      ['aiUsage', AiUsageService],
      ['chat', ChatService],
      ['library', LibraryService],
      ['libraryClassifier', LibraryClassifier],
      ['books', BookService],
    ];
    const made = new Map(pairs.map(([key, token]) => [token, { key }]));
    made.forEach((value, token) => instances.set(token, value));

    const readers = services.readers() as unknown as Record<string, unknown>;

    for (const [key, token] of pairs) {
      expect(readers[key]).toBe(made.get(token));
    }
  });

  it('when the library, the AI catalog and the usage are asked, should come from the single container (no module lookup)', () => {
    const { asked, services } = setup();

    services.readers();

    expect(asked.filter((token) => token === AIService)).toHaveLength(1);
    expect(asked.filter((token) => token === AiUsageService)).toHaveLength(1);
    expect(asked.filter((token) => token === LibraryService)).toHaveLength(1);
  });

  it('when building the jobs readers, should hand the JobService instance itself as the deleter', () => {
    const { instances, services } = setup();
    const jobService = { deleteMany: jest.fn(), deleteAll: jest.fn() };

    instances.set(JobService, jobService);

    expect(services.readers().jobs.deleter).toBe(jobService);
  });

  it('when listing jobs, should read them from the JobService instance of the container', () => {
    const { instances, services } = setup();
    const job = { toJSON: () => ({ id: 'j1', status: 'pending' }) };
    instances.set(JobService, { findAll: () => [job] });

    expect(services.readers().jobs.catalog.list()).toEqual([{ id: 'j1', status: 'pending' }]);
  });

  it('when listing the job types, should answer the three types of the back configuration', () => {
    const { services } = setup();

    expect(
      services
        .readers()
        .jobs.catalog.listTypes()
        .map((type) => type.type),
    ).toEqual(['video-to-transcript', 'video-to-summary', 'pdf-to-summary']);
  });

  it('when starting a transcript job, should validate the hints with the back parser, create it and queue it with the transcript processor', () => {
    const { instances, services } = setup();
    const job = { id: 'j1', status: 'pending' };
    const create = jest.fn().mockReturnValue(job);
    const run = jest.fn();
    const transcript = { name: 'transcript' };
    instances.set(JobService, { create, findAll: () => [] });
    instances.set(JobRunner, { run });
    instances.set(VideoToTranscriptJobProcessor, transcript);
    instances.set(VideoToSummaryJobProcessor, { name: 'summary' });

    const created = services
      .readers()
      .jobs.launcher.startVideoToTranscript({ url: 'https://x/v.mp4', title: '  Aula   1  ' });

    expect(created).toEqual({ id: 'j1', status: 'pending' });
    expect(create).toHaveBeenCalledWith(
      'video-to-transcript',
      { title: 'Aula 1' },
      { url: 'https://x/v.mp4', title: '  Aula   1  ' },
    );
    expect(run).toHaveBeenCalledWith(job, transcript, 'https://x/v.mp4');
  });

  it('when the hints are invalid, should reject with the back validation message and queue nothing', () => {
    const { instances, services } = setup();
    const create = jest.fn();
    const run = jest.fn();
    instances.set(JobService, { create, findAll: () => [] });
    instances.set(JobRunner, { run });

    expect(() =>
      services
        .readers()
        .jobs.launcher.startVideoToTranscript({ url: 'u', tags: 5 as unknown as string[] }),
    ).toThrow('O campo "tags" deve ser uma lista de textos.');
    expect(create).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('when the container fails to provide a service, should propagate the error', () => {
    const resolve = jest.fn(() => {
      throw new Error('provider não encontrado');
    });

    expect(() => new BackServices(resolve as ServiceResolver).readers()).toThrow(
      'provider não encontrado',
    );
  });
});
