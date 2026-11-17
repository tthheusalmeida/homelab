import type { ReactNode } from 'react';

import { Button } from '#ui/button';

interface ValueStepperProps {
  label: string;
  value: string;
  decreaseLabel: string;
  increaseLabel: string;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseIcon: ReactNode;
  increaseIcon: ReactNode;
  onDecrease: () => void;
  onIncrease: () => void;
  /** Esconde o rótulo visível (quando a linha já tem um título); o valor mantém o nome para leitores de tela. */
  hideLabel?: boolean;
}

/**
 * Rótulo, botão de diminuir, valor e botão de aumentar, em uma linha compacta (ajustes de leitura
 * no painel lateral e nas Configurações). Os botões desligam nos limites.
 */
export function ValueStepper({
  label,
  value,
  decreaseLabel,
  increaseLabel,
  canDecrease,
  canIncrease,
  decreaseIcon,
  increaseIcon,
  onDecrease,
  onIncrease,
  hideLabel = false,
}: ValueStepperProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {!hideLabel && <span className="text-xs text-muted-foreground">{label}</span>}

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label={decreaseLabel}
          disabled={!canDecrease}
          onClick={onDecrease}
        >
          {decreaseIcon}
        </Button>

        <output aria-label={label} className="w-11 text-center font-mono text-xs tabular-nums">
          {value}
        </output>

        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label={increaseLabel}
          disabled={!canIncrease}
          onClick={onIncrease}
        >
          {increaseIcon}
        </Button>
      </div>
    </div>
  );
}
