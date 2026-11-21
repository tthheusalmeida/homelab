import type { ComponentProps, ReactNode } from 'react';

import { Button } from '#ui/button';
import { Tip } from '#components/Tip';

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
  /** `icon-sm` (padrão) ou `icon-xs`, o botãozinho dos controles que ficam dentro de um bloco. */
  size?: 'icon-sm' | 'icon-xs';
}

/**
 * Botão só com ícone e **tooltip com a ação** ao passar o mouse ou focar com o teclado. Use para
 * ações que o ícone já diz (zoom, ajustar, baixar...): o nome acessível é o mesmo texto do tooltip.
 * Botão desabilitado não mostra o tooltip (não recebe o mouse).
 */
export function IconButton({
  label,
  children,
  tooltipSide = 'top',
  size = 'icon-sm',
  variant = 'outline',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <Tip content={label} side={tooltipSide}>
      <Button type={type} size={size} variant={variant} aria-label={label} {...props}>
        {children}
      </Button>
    </Tip>
  );
}
