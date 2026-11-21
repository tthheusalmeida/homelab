import type { ReactNode } from 'react';

import { ZoomIn, ZoomOut } from 'lucide-react';

import { cn } from '#lib/utils';

import { IconButton } from './IconButton';

interface FloatingToolbarProps {
  /** Nome da barra para leitores de tela ("Controles do mapa"). */
  label: string;
  /**
   * Onde a barra fica: `absolute` flutua no rodapé de uma área com `position: relative` (o mapa
   * mental); `sticky` flutua no rodapé da área que rola, ao lado do conteúdo (o infográfico). Nos dois
   * a barra fica parada no centro quando o zoom muda o tamanho do conteúdo.
   */
  placement?: 'absolute' | 'sticky';
  children: ReactNode;
  className?: string;
}

/**
 * Barra de botões flutuante (só ícones, com tooltip) usada pelo mapa mental e pelo infográfico: o
 * mesmo visual e o mesmo lugar, centralizada embaixo, e **não se mexe** ao dar zoom. Cliques e
 * arrastes nela não chegam à área de baixo (o mapa arrasta ao clicar e arrastar).
 *
 * **Altura padrão: 1,25 rem (20 px) acima da borda da janela**, no modo normal e no modo leitura, nas
 * duas telas. O infográfico (`sticky`) usa 1,25 rem direto. O mapa (`absolute`) fica 4 px acima do
 * quadro dele, que na página termina 16 px acima da janela (`DocumentPage`: `100svh-13rem+9px`; se o
 * layout da página mudar, confira a medida). No modo leitura o conteúdo vai até a borda da janela, então
 * o `ReadingMode` define `--floating-toolbar-bottom: 1.25rem`. Em quem usa a barra, não ponha padding
 * na área que rola (ele desloca o `sticky`).
 */
export function FloatingToolbar({
  label,
  placement = 'absolute',
  children,
  className,
}: FloatingToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      data-placement={placement}
      className={cn(
        'z-20 flex cursor-default flex-wrap items-center justify-center gap-1 rounded-xl border bg-card/95 p-1.5 shadow-lg backdrop-blur',
        placement === 'absolute'
          ? 'absolute bottom-[var(--floating-toolbar-bottom,0.25rem)] left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2'
          : 'sticky bottom-[var(--floating-toolbar-bottom,1.25rem)] mx-auto w-fit max-w-full',
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

/** Traço fino entre grupos de botões da barra. */
export function ToolbarSeparator() {
  return <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />;
}

interface ZoomButtonsProps {
  /** Tamanho atual em porcentagem (100 = normal). */
  percent: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Nome do número do meio ("Tamanho do mapa"). */
  sizeLabel: string;
}

/** Diminuir, tamanho atual e aumentar: os botões de zoom da barra flutuante. */
export function ZoomButtons({
  percent,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  sizeLabel,
}: ZoomButtonsProps) {
  return (
    <>
      <IconButton label={decreaseLabel} disabled={!canDecrease} onClick={onDecrease}>
        <ZoomOut />
      </IconButton>

      <span
        aria-label={sizeLabel}
        className="w-11 text-center text-xs font-medium text-muted-foreground tabular-nums"
      >
        {percent}%
      </span>

      <IconButton label={increaseLabel} disabled={!canIncrease} onClick={onIncrease}>
        <ZoomIn />
      </IconButton>
    </>
  );
}
