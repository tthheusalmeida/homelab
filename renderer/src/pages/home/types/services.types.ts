import { IpcChannels } from "#shared/channels";

export const services = [
  {
    name: "HomeLab",
    description: "Back end principal do HomeLab",
    healthChannel: IpcChannels.health.system,
  },
  {
    name: "AI",
    description: "Serviços de AI",
    healthChannel: IpcChannels.health.ai,
  },
] as const;

export type HealthCheckStatus = "ok" | "error";

export interface HealthCheck {
  service: string;
  description: string;
  status: HealthCheckStatus;
}

export interface HealthService {
  service: string;
  description: string;
  checks: HealthCheck[];
}

export type Service = (typeof services)[number];
