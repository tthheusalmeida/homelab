import { Cpu, MemoryStick, Sparkles } from 'lucide-react';

import { ComponentStrings } from '#lib/components-text';
import type { HardwareProfile } from '#shared/contracts/components';

const MB_PER_GB = 1024;

/** O que o app identificou do computador e o que recomenda por isso (com a explicação). */
export function HardwareCard({ hardware }: { hardware: HardwareProfile }) {
  const gb = (mb: number) => Math.round(mb / MB_PER_GB);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-col gap-1.5">
        <h3 className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          {ComponentStrings.hardwareTitle}
        </h3>

        <ul className="flex flex-col gap-1 text-xs">
          {hardware.gpus.length === 0 ? (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Cpu aria-hidden className="size-3.5" />
              {ComponentStrings.hardwareUnknown}
            </li>
          ) : (
            hardware.gpus.map((gpu) => (
              <li key={gpu.name} className="flex items-center gap-2">
                <Cpu aria-hidden className="size-3.5 text-muted-foreground" />
                <span>
                  {gpu.name} ({ComponentStrings.gpuKind[gpu.kind]}
                  {gpu.vramMb ? `, ${ComponentStrings.vram(gb(gpu.vramMb))}` : ''})
                </span>
              </li>
            ))
          )}

          <li className="flex items-center gap-2">
            <MemoryStick aria-hidden className="size-3.5 text-muted-foreground" />
            {ComponentStrings.ram(gb(hardware.ramMb))}
          </li>
        </ul>
      </div>

      <p className="flex items-start gap-2 text-sm">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{hardware.recommendation.message}</span>
      </p>
    </div>
  );
}
