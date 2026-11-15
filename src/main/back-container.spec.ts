import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';

import type { BackConfig } from '../back/config/back-config';
import { AIService } from '../back/modules/ai/ai.service';
import { AiUsageService } from '../back/modules/ai/usage/ai-usage.service';
import { WhisperService } from '../back/modules/ai/whisper/whisper.service';
import { ChatService } from '../back/modules/chat/chat.service';
import { HealthAIService } from '../back/modules/health/ai/health-ai.service';
import { HealthSystemService } from '../back/modules/health/system/health-system.service';
import { JobRunner } from '../back/modules/jobs/application/job-runner.service';
import { JobService } from '../back/modules/jobs/application/job.service';
import { BookService } from '../back/modules/library/application/book.service';
import { LibraryClassifier } from '../back/modules/library/application/library-classifier';
import { LibraryService } from '../back/modules/library/application/library.service';
import { VideoService } from '../back/modules/video/video.service';

import { BackContainer } from './back-container';

describe('BackContainer', () => {
  let root: string;
  let container: BackContainer;
  const whisper = { transcribe: jest.fn().mockResolvedValue('texto') };

  const config = (): BackConfig => ({
    libraryDir: path.join(root, 'library'),
    inboxDir: path.join(root, 'inbox'),
    videoTempDir: path.join(root, 'tv'),
    audioTempDir: path.join(root, 'ta'),
    ollamaUrl: 'http://127.0.0.1:1',
    geminiApiKey: null,
  });

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'back-container-'));
    container = await BackContainer.start({ config: config(), whisper });
  });

  afterAll(async () => {
    await container.stop();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('when started with a real Nest context, should provide every service the handlers use', () => {
    const tokens = [
      HealthSystemService,
      HealthAIService,
      AIService,
      AiUsageService,
      ChatService,
      LibraryService,
      LibraryClassifier,
      BookService,
      JobService,
      JobRunner,
      VideoService,
    ];

    for (const token of tokens) {
      expect(container.get(token)).toBeInstanceOf(token);
    }
  });

  it('when the whisper port is asked, should answer the transcriber given at start', () => {
    expect(container.get(WhisperService)).toBe(whisper);
  });

  it('when the same service is asked twice, should answer the same instance', () => {
    expect(container.get(AiUsageService)).toBe(container.get(AiUsageService));
    expect(container.get(JobService)).toBe(container.get(JobService));
  });

  it('when the video and chat services use the AI service, should be the one single AIService (one usage in memory)', () => {
    const ai = container.get<AIService>(AIService);
    const video = container.get<{ aiService: unknown }>(VideoService);
    const chat = container.get<{ aiService: unknown }>(ChatService);

    expect(video.aiService).toBe(ai);
    expect(chat.aiService).toBe(ai);
  });

  it('when there is no Gemini key, should still start and list the providers', () => {
    expect(
      container
        .get<AIService>(AIService)
        .providersList()
        .map((p) => p.id),
    ).toEqual(['ollama', 'gemini']);
  });

  it('when the library service starts, should read the folders from the injected config', () => {
    expect(container.get<LibraryService>(LibraryService).indexStatus()).toEqual({
      total: 0,
      errors: [],
    });
  });

  it('when the container starts, should not call listen on any TCP server (no HTTP, no open port)', async () => {
    const listen = jest.spyOn(net.Server.prototype, 'listen');
    const another = await BackContainer.start({ config: config(), whisper });

    try {
      expect(listen).not.toHaveBeenCalled();
    } finally {
      await another.stop();
      listen.mockRestore();
    }
  });
});
