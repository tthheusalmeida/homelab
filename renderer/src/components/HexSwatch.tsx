import type { ComponentProps, CSSProperties, ReactNode } from 'react';

import { cn } from '#lib/utils';

const HEX = '[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]';

interface HexSwatchProps extends Omit<ComponentProps<'button'>, 'color'> {
  /** Opção escolhida: ganha um contorno hexagonal. */
  selected: boolean;
  /** Cor de preenchimento (qualquer valor de CSS). */
  color?: string;
  /** Classes do preenchimento (ex.: `bg-primary`), quando a cor vem do tema. */
  fillClassName?: string;
  size?: 'sm' | 'md';
  /** Marca dentro do hexágono (ex.: o "check" da opção escolhida). */
  children?: ReactNode;
}

/**
 * Seletor de cor hexagonal (a forma da colmeia da marca): um botão de rádio com o preenchimento
 * em hexágono de pontas para cima. É a única forma de amostra de cor do app (cor de destaque,
 * cores e intensidades da leitura). O contorno de "escolhido" também é um hexágono.
 */
export function HexSwatch({
  selected,
  color,
  fillClassName,
  size = 'md',
  className,
  children,
  style,
  ...props
}: HexSwatchProps) {
  const fill: CSSProperties | undefined = color ? { backgroundColor: color } : undefined;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="hex-swatch"
      className={cn(
        'group relative shrink-0 outline-none transition-transform duration-200 hover:scale-110',
        size === 'md' ? 'h-6 w-[1.3rem]' : 'h-5 w-[1.08rem]',
        className,
      )}
      style={style}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 bg-foreground opacity-0 transition-opacity duration-200 group-focus-visible:opacity-60',
          HEX,
          selected && 'opacity-100',
        )}
      />

      <span
        aria-hidden
        className={cn('absolute inset-[2px] flex items-center justify-center', HEX, fillClassName)}
        style={fill}
      >
        {children}
      </span>
    </button>
  );
}
