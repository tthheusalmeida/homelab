import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { BackConfig } from '../../../config/back-config';

import { AiUsageService, MAX_USAGE_RECORDS, RECENT_REQUESTS_LIMIT } from './ai-usage.service';
import type { AIUsageRecord } from './ai-usage.model';

type Input = Omit<AIUsageRecord, 'id' | 'createdAt'>;

const base: Input = {
  provider: 'ollama',
  model: 'm1',
  operation: 'chat',
  inputTokens: 10,
  outputTokens: 5,
  totalTokens: 15,
  estimatedCost: 0.5,
  latencyMs: 100,
  success: true,
};

describe('AiUsageService', () => {
  let service: AiUsageService;

  beforeEach(() => {
    service = new AiUsageService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('record', () => {
    it('when a usage is recorded, should generate id and createdAt and return the record', () => {
      const record = service.record(base);

      expect(record).toMatchObject(base);
      expect(record.id).toEqual(expect.any(String));
      expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt);
    });

    it('when several usages are recorded, should keep the most recent first', () => {
      service.record({ ...base, model: 'a' });
      service.record({ ...base, model: 'b' });

      const { recentRequests } = service.getUsage();

      expect(recentRequests.map((r) => r.model)).toEqual(['b', 'a']);
    });

    it('when more than the limit of usages are recorded, should discard the oldest', () => {
      for (let i = 0; i < MAX_USAGE_RECORDS + 1; i++) {
        service.record({ ...base, model: `m${i}` });
      }

      const { summary } = service.getUsage();

      expect(summary.totalRequests).toBe(MAX_USAGE_RECORDS);
    });
  });

  describe('getUsage', () => {
    it('when there are no records, should return everything zeroed', () => {
      const usage = service.getUsage();

      expect(usage.summary).toEqual({
        totalRequests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        averageLatencyMs: 0,
      });
      expect(usage.timeline).toEqual([]);
      expect(usage.byProvider).toEqual([]);
      expect(usage.byModel).toEqual([]);
      expect(usage.recentRequests).toEqual([]);
    });

    it('when there are records, should sum tokens and cost and round the average latency', () => {
      service.record({ ...base, latencyMs: 100 });
      service.record({ ...base, latencyMs: 201 });

      expect(service.getUsage().summary).toEqual({
        totalRequests: 2,
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
        estimatedCost: 1,
        averageLatencyMs: 151,
      });
    });

    it('when a provider is given, should filter every section by it', () => {
      service.record({ ...base, provider: 'ollama' });
      service.record({ ...base, provider: 'gemini', model: 'g' });

      const usage = service.getUsage('gemini');

      expect(usage.summary.totalRequests).toBe(1);
      expect(usage.byProvider.map((p) => p.provider)).toEqual(['gemini']);
      expect(usage.byModel.map((m) => m.model)).toEqual(['g']);
      expect(usage.recentRequests).toHaveLength(1);
    });

    it('when records have different providers, should group them by provider', () => {
      service.record({ ...base, provider: 'ollama' });
      service.record({ ...base, provider: 'ollama' });
      service.record({ ...base, provider: 'gemini' });

      const byProvider = service.getUsage().byProvider;

      expect(byProvider.find((p) => p.provider === 'ollama')?.requests).toBe(2);
      expect(byProvider.find((p) => p.provider === 'gemini')?.requests).toBe(1);
    });

    it('when the same model name exists in two providers, should not mix them', () => {
      service.record({ ...base, provider: 'ollama', model: 'x' });
      service.record({ ...base, provider: 'gemini', model: 'x' });
      service.record({ ...base, provider: 'ollama', model: 'x' });

      const byModel = service.getUsage().byModel;

      expect(byModel).toHaveLength(2);
      expect(byModel.find((m) => m.provider === 'ollama' && m.model === 'x')?.requests).toBe(2);
    });

    it('when records span several days, should group the timeline by UTC day in ascending order', () => {
      jest.useFakeTimers();

      jest.setSystemTime(new Date('2026-01-02T10:00:00Z'));
      service.record(base);
      jest.setSystemTime(new Date('2026-01-01T10:00:00Z'));
      service.record(base);
      service.record(base);

      const timeline = service.getUsage().timeline;

      expect(timeline.map((t) => t.date)).toEqual(['2026-01-01', '2026-01-02']);
      expect(timeline[0]).toMatchObject({
        requests: 2,
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
        estimatedCost: 1,
      });
    });

    it('when there are more than 10 records, should limit recentRequests to the 10 newest', () => {
      for (let i = 0; i < 25; i++) {
        service.record({ ...base, model: `m${i}` });
      }

      const { recentRequests } = service.getUsage();

      expect(recentRequests).toHaveLength(RECENT_REQUESTS_LIMIT);
      expect(recentRequests[0].model).toBe('m24');
      expect(recentRequests[9].model).toBe('m15');
    });

    it('when a request failed, should keep it in recentRequests with the reason', () => {
      service.record(base);
      service.recordFailure({ provider: 'gemini', model: 'm', latencyMs: 40, error: 'Limite de uso atingido.' });

      const [latest] = service.getUsage().recentRequests;

      expect(latest).toMatchObject({
        success: false,
        error: 'Limite de uso atingido.',
        totalTokens: 0,
        estimatedCost: 0,
        operation: 'chat',
      });
    });

    it('when failures are among the recent ones, should not count them as spent tokens', () => {
      service.record(base);
      service.recordFailure({ provider: 'gemini', model: 'm', latencyMs: 40, error: 'x' });

      expect(service.getUsage().summary.totalTokens).toBe(base.totalTokens);
    });
  });
});

describe('AiUsageService persistence', () => {
  let dir: string;
  let file: string;
  const config = () => ({ usageFile: file }) as BackConfig;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homelab-usage-'));
    file = path.join(dir, 'sub', 'ai-usage.json');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when a usage is recorded, should write it to the file (creating the folder)', () => {
    new AiUsageService(config()).record(base);

    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));

    expect(saved.records).toHaveLength(1);
    expect(saved.records[0]).toMatchObject(base);
  });

  it('when the app restarts, should load the usage recorded before', () => {
    const first = new AiUsageService(config());
    first.record({ ...base, model: 'a', estimatedCost: 1 });
    first.record({ ...base, model: 'b', estimatedCost: 2 });

    const second = new AiUsageService(config());
    const { summary, recentRequests } = second.getUsage();

    expect(summary.totalRequests).toBe(2);
    expect(summary.estimatedCost).toBe(3);
    expect(recentRequests.map((r) => r.model)).toEqual(['b', 'a']);
  });

  it('when the app restarts and records more, should keep the old ones and add the new', () => {
    new AiUsageService(config()).record({ ...base, model: 'old' });

    const second = new AiUsageService(config());
    second.record({ ...base, model: 'new' });

    expect(new AiUsageService(config()).getUsage().summary.totalRequests).toBe(2);
  });

  it('when the file is corrupt, should start empty without failing', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{nao e json');

    expect(new AiUsageService(config()).getUsage().summary.totalRequests).toBe(0);
  });

  it('when the file has no records list, should start empty', () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 1 }));

    expect(new AiUsageService(config()).getUsage().summary.totalRequests).toBe(0);
  });

  it('when the file cannot be written, should keep counting in memory', () => {
    const blocked = path.join(dir, 'arquivo');
    fs.writeFileSync(blocked, 'x');
    const service = new AiUsageService({
      usageFile: path.join(blocked, 'ai-usage.json'),
    } as BackConfig);

    expect(() => service.record(base)).not.toThrow();
    expect(service.getUsage().summary.totalRequests).toBe(1);
  });

  it('when there is no usage file configured, should not write anything', () => {
    const service = new AiUsageService({ usageFile: null } as BackConfig);
    service.record(base);

    expect(fs.existsSync(file)).toBe(false);
    expect(service.getUsage().summary.totalRequests).toBe(1);
  });

  describe('backup: exportar, importar e falha ao gravar', () => {
    let service: AiUsageService;

    beforeEach(() => {
      service = new AiUsageService();
    });

    const record = (id: string, createdAt: string): AIUsageRecord => ({
      ...base,
      id,
      createdAt,
    });

    it('when exporting, should answer a copy of the records, newest first', () => {
      service.record(base);
      service.record(base);

      const exported = service.exportRecords();

      expect(exported).toHaveLength(2);
      exported.pop();
      expect(service.exportRecords()).toHaveLength(2);
    });

    it('when merging, should add only unknown ids, keep newest first and count the repeated ones', () => {
      const existing = service.record(base);

      const result = service.importRecords(
        [
          { ...existing },
          record('velho', '2020-01-01T00:00:00.000Z'),
          record('novo', '2099-01-01T00:00:00.000Z'),
          { id: 7 },
        ],
        'merge',
      );

      expect(result).toEqual({ added: 2, skipped: 2 });
      expect(service.exportRecords().map((item) => item.id)).toEqual([
        'novo',
        existing.id,
        'velho',
      ]);
    });

    it('when merging the same id twice in the same backup, should add it once', () => {
      const result = service.importRecords(
        [record('x', '2026-01-01T00:00:00.000Z'), record('x', '2026-01-01T00:00:00.000Z')],
        'merge',
      );

      expect(result.added).toBe(1);
      expect(service.exportRecords()).toHaveLength(1);
    });

    it('when replacing, should drop the current records and keep only the backup ones', () => {
      service.record(base);

      const result = service.importRecords([record('a', '2026-01-01T00:00:00.000Z')], 'replace');

      expect(result).toEqual({ added: 1, skipped: 0 });
      expect(service.exportRecords().map((item) => item.id)).toEqual(['a']);
    });

    it('when the backup has more records than the limit, should keep only the most recent ones', () => {
      const many = Array.from({ length: MAX_USAGE_RECORDS + 5 }, (_unused, index) =>
        record(`r${index}`, new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString()),
      );

      service.importRecords(many, 'replace');

      expect(service.exportRecords()).toHaveLength(MAX_USAGE_RECORDS);
      expect(service.exportRecords()[0].id).toBe(`r${MAX_USAGE_RECORDS + 4}`);
    });

    it('when writing the usage file fails, should keep the record in memory and tell the alerts why', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-alert-'));
      // um arquivo no lugar da pasta faz o mkdir do arquivo de consumo falhar
      const blocker = path.join(dir, 'bloqueio');

      fs.writeFileSync(blocker, 'x');
      const alerts = { persistFailed: jest.fn(), jobFinished: jest.fn() };
      const failing = new AiUsageService(
        { usageFile: path.join(blocker, 'ai-usage.json') } as BackConfig,
        alerts,
      );

      try {
        failing.record(base);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }

      expect(failing.exportRecords()).toHaveLength(1);
      expect(alerts.persistFailed).toHaveBeenCalledWith('o consumo de IA', expect.any(String));
    });
  });
});
