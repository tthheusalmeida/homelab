import type { ComponentProps, ReactNode } from 'react';

import { Button } from '#ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#ui/tooltip';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface IconButtonProps extends Omit<
  ComponentProps<typeof Button>,
  'children' | 'size' | 'title' | 'aria-label'
> {
  /** O que o botão faz: é o nome para leitores de tela e o texto do tooltip ao passar o mouse. */
  label: string;
  /** O ícone (só ele aparece no botão). */
  children: ReactNode;
  /** Lado em que o tooltip abre. */
  tooltipSide?: TooltipSide;
}

/** Espera antes de o tooltip aparecer (ms): curta, para o botão sem texto se explicar logo. */
const TOOLTIP_DELAY_MS = 150;

/**
 * Botão só com ícone e **tooltip com a ação** ao passar o mouse ou focar com o teclado. Use para
 * ações que o ícone já diz (zoom, ajustar, baixar...): o nome acessível é o mesmo texto do tooltip.
 * Botão desabilitado não mostra o tooltip (não recebe o mouse).
 */
export function IconButton({
  label,
  children,
  tooltipSide = 'top',
  variant = 'outline',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <TooltipProvider delay={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button type={type} size="icon-sm" variant={variant} aria-label={label} {...props}>
              {children}
            </Button>
          }
        />

        <TooltipContent side={tooltipSide}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
