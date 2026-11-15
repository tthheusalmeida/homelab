import * as fs from 'node:fs';
import * as path from 'node:path';

import { Injectable, Optional } from '@nestjs/common';

import { BackConfig } from '../../../config/back-config';
import type { AIProviderName } from '../ai.model';

import type {
  AIModelUsage,
  AIProviderUsage,
  AIUsageRecord,
  AIUsageResponse,
  AIUsageSummary,
  AIUsageTimeline,
} from './ai-usage.model';

/** Registros guardados (os mais recentes); o resto é descartado. */
export const MAX_USAGE_RECORDS = 5000;

/**
 * Consumo de IA do app. Fica em memória e, quando o `BackConfig` informa `usageFile`, também em
 * disco: sobrevive a reinícios. É o consumo **registrado pelo HomeLab neste computador** (tokens
 * devolvidos pelas respostas), não o gasto real da conta no provedor.
 */
@Injectable()
export class AiUsageService {
  private readonly records: AIUsageRecord[];

  private readonly maxRecords = MAX_USAGE_RECORDS;

  private readonly file: string | null;

  constructor(@Optional() config?: BackConfig) {
    this.file = config?.usageFile ?? null;
    this.records = this.load();
  }

  record(data: Omit<AIUsageRecord, 'id' | 'createdAt'>): AIUsageRecord {
    const record: AIUsageRecord = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.records.unshift(record);

    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }

    this.save();

    return record;
  }

  private load(): AIUsageRecord[] {
    if (!this.file) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const list = (parsed as { records?: unknown })?.records;

      return Array.isArray(list) ? (list as AIUsageRecord[]).slice(0, this.maxRecords) : [];
    } catch {
      // sem arquivo ou ilegível: começa do zero (o próximo registro grava um arquivo novo)
      return [];
    }
  }

  private save(): void {
    if (!this.file) {
      return;
    }

    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ version: 1, records: this.records }));
    } catch {
      // não conseguiu gravar: o consumo segue valendo em memória
    }
  }

  getUsage(provider?: AIProviderName): AIUsageResponse {
    const records = provider
      ? this.records.filter((record) => record.provider === provider)
      : this.records;

    return {
      summary: this.buildSummary(records),
      timeline: this.buildTimeline(records),
      byProvider: this.buildProviderUsage(records),
      byModel: this.buildModelUsage(records),
      recentRequests: records.slice(0, 100),
    };
  }

  private buildSummary(records: AIUsageRecord[]): AIUsageSummary {
    const totalRequests = records.length;

    const inputTokens = records.reduce((sum, record) => sum + record.inputTokens, 0);

    const outputTokens = records.reduce((sum, record) => sum + record.outputTokens, 0);

    const totalTokens = records.reduce((sum, record) => sum + record.totalTokens, 0);

    const estimatedCost = records.reduce((sum, record) => sum + record.estimatedCost, 0);

    const totalLatency = records.reduce((sum, record) => sum + record.latencyMs, 0);

    return {
      totalRequests,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      averageLatencyMs: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
    };
  }

  private buildTimeline(records: AIUsageRecord[]): AIUsageTimeline[] {
    const grouped = new Map<string, AIUsageTimeline>();

    for (const record of records) {
      const date = record.createdAt.slice(0, 10);

      const current = grouped.get(date);

      if (current) {
        current.requests += 1;
        current.inputTokens += record.inputTokens;
        current.outputTokens += record.outputTokens;
        current.totalTokens += record.totalTokens;
        current.estimatedCost += record.estimatedCost;
        continue;
      }

      grouped.set(date, {
        date,
        requests: 1,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        totalTokens: record.totalTokens,
        estimatedCost: record.estimatedCost,
      });
    }

    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  private buildProviderUsage(records: AIUsageRecord[]): AIProviderUsage[] {
    const grouped = new Map<AIProviderName, AIUsageRecord[]>();

    for (const record of records) {
      const providerRecords = grouped.get(record.provider) ?? [];

      providerRecords.push(record);

      grouped.set(record.provider, providerRecords);
    }

    return [...grouped.entries()].map(([provider, providerRecords]) => {
      const summary = this.buildSummary(providerRecords);

      return {
        provider,

        requests: summary.totalRequests,

        inputTokens: summary.inputTokens,
        outputTokens: summary.outputTokens,
        totalTokens: summary.totalTokens,

        estimatedCost: summary.estimatedCost,
        averageLatencyMs: summary.averageLatencyMs,
      };
    });
  }

  private buildModelUsage(records: AIUsageRecord[]): AIModelUsage[] {
    const grouped = new Map<string, AIUsageRecord[]>();

    for (const record of records) {
      const key = `${record.provider}:${record.model}`;

      const modelRecords = grouped.get(key) ?? [];

      modelRecords.push(record);

      grouped.set(key, modelRecords);
    }

    return [...grouped.entries()].map(([, modelRecords]) => {
      const first = modelRecords[0];

      const summary = this.buildSummary(modelRecords);

      return {
        provider: first.provider,
        model: first.model,

        requests: summary.totalRequests,

        inputTokens: summary.inputTokens,
        outputTokens: summary.outputTokens,
        totalTokens: summary.totalTokens,

        estimatedCost: summary.estimatedCost,
        averageLatencyMs: summary.averageLatencyMs,
      };
    });
  }
}
