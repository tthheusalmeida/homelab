import { useRef, useState } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#ui/tooltip';
import { cn } from '#lib/utils';

/** Espera antes de o tooltip aparecer (ms): curta, para o nome inteiro aparecer logo. */
const TOOLTIP_DELAY_MS = 300;

interface TruncatedTextProps {
  /** O texto. Quando não cabe e vira reticências, o tooltip mostra ele inteiro. */
  children: string;
  className?: string;
  /** Lado em que o tooltip abre. */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Texto de uma linha que termina em reticências quando não cabe, com **tooltip com o texto inteiro só
 * quando ele foi cortado** (se cabe, não há tooltip). A medida é tirada ao passar o mouse ou focar,
 * então acompanha o tamanho que o texto tem naquele momento.
 */
export function TruncatedText({ children, className, side = 'right' }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  const measure = () => {
    const element = ref.current;

    setTruncated(element !== null && element.scrollWidth > element.clientWidth);
  };

  return (
    <TooltipProvider delay={TOOLTIP_DELAY_MS}>
      <Tooltip disabled={!truncated}>
        <TooltipTrigger
          render={
            <span
              ref={ref}
              className={cn('truncate', className)}
              onMouseEnter={measure}
              onFocus={measure}
            >
              {children}
            </span>
          }
        />

        <TooltipContent side={side}>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
