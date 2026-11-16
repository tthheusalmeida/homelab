import { HexDot, HoneycombBackdrop } from "#components/Hex";

import { ActivitySection } from "./components/ActivitySection";
import { OverviewSection } from "./components/OverviewSection";
import { QuickActions } from "./components/QuickActions";
import { RecentPagesSection } from "./components/RecentPagesSection";
import { ServicesSection } from "./components/ServicesSection";
import { SystemStatus } from "./components/SystemStatus";

import { useSystemHealth } from "./hooks/useSystemHealth";

export function HomePage() {
  const health = useSystemHealth();

  return (
    <div className="relative min-h-[80dvh] overflow-hidden bg-background text-foreground">
      <HoneycombBackdrop />

      <div className="relative mx-auto space-y-8">
        {/* Painel de terminal: a cara de console do homelab */}
        <section
          aria-label="Painel do HomeLab"
          className="overflow-hidden rounded-lg border border-border bg-card/60 select-none"
        >
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <HexDot className="bg-red-500/80" />
            <HexDot className="bg-amber-500/80" />
            <HexDot className="bg-emerald-500/80" />

            <span className="ml-2 font-mono text-xs text-muted-foreground">homelab — status</span>
          </div>

          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="text-brand">root@homelab:~$</span>
                <span>./home --status</span>
                <span className="inline-block h-3.5 w-1.5 animate-pulse bg-brand" />
              </div>

              <h1 className="text-4xl font-semibold tracking-tight">HomeLab</h1>

              <p className="text-sm text-muted-foreground">
                Central de controle do seu ambiente.
              </p>
            </div>

            <div className="flex flex-col font-mono text-xs text-muted-foreground sm:items-end">
              <span>/status</span>
              <SystemStatus
                isLoading={health.isLoading}
                allOnline={health.allOnline}
                allOffline={health.allOffline}
              />
            </div>
          </div>
        </section>

        <OverviewSection health={health} />

        <ActivitySection />

        <QuickActions />

        <RecentPagesSection />

        <ServicesSection />
      </div>
    </div>
  );
}
