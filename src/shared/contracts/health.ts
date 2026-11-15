export type HealthStatus = 'ok' | 'error';

export interface HealthCheck {
  service: string;
  description: string;
  status: HealthStatus;
}

/** Resposta de `health:system` e `health:ai` (mesmo formato do `GET health/*` de hoje). */
export interface HealthReport {
  service: string;
  description: string;
  checks: HealthCheck[];
}
