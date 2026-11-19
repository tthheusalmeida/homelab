import type { Ref } from 'react';

import { cn } from '#lib/utils';

import { ReadingSideTab } from './ReadingSideTab';

interface ReadingSideToggleProps {
  /** Painel aberto: só muda o que leitores de tela anunciam. */
  open?: boolean;
  onClick?: () => void;
  /** Posição (fixa no modo leitura, absoluta no preview); o visual do botão é sempre o mesmo. */
  className?: string;
  /** No preview das Configurações: o mesmo botão, só de enfeite (sem foco, clique ou leitor de tela). */
  preview?: boolean;
  /** Borda da tela em que o botão fica (padrão: direita). */
  side?: 'left' | 'right';
  /** Nome acessível do botão. */
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * O botão que abre o painel lateral do modo leitura: a aba hexagonal invertida num botão. É o
 * **mesmo componente** no modo leitura (`ReadingSidePanel`) e no preview das Configurações
 * (`ReadingPreview`), então o preview mostra exatamente o botão que aparece de verdade.
 */
export function ReadingSideToggle({
  open = false,
  onClick,
  className,
  preview = false,
  side = 'right',
  label = 'Mostrar painel lateral',
  ref,
}: ReadingSideToggleProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={open ? 'Clique para fechar o painel' : 'Clique para abrir o painel'}
      aria-expanded={open}
      {...(preview ? { 'aria-hidden': true, tabIndex: -1 } : {})}
      className={cn(
        'group z-20 cursor-pointer outline-none',
        preview && 'pointer-events-none',
        className,
      )}
      onClick={onClick}
    >
      <ReadingSideTab open={open} side={side} />
    </button>
  );
}
