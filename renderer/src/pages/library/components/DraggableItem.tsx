import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";

import { cn } from "#lib/utils";

const SLIDE_MS = 220;

interface DraggableItemProps {
  id: string;
  /** Id de quem está sendo arrastado agora (`null` = ninguém). */
  draggingId: string | null;
  onDragStart: (id: string) => void;
  /** O item arrastado passou por cima deste: quem usa troca os dois de lugar na prévia. */
  onHover: (targetId: string) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  index: number;
  children: ReactNode;
}

/**
 * Envolve um item da lista para poder reordená-lo arrastando (grade, cartões e lista). Quando a posição muda,
 * o item desliza até o novo lugar em vez de pular.
 */
export function DraggableItem({
  id,
  draggingId,
  onDragStart,
  onHover,
  onDrop,
  onDragEnd,
  index,
  children,
}: DraggableItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<{ left: number; top: number } | null>(null);
  const beingDragged = draggingId === id;

  // Posição em relação ao contêiner (não muda ao rolar a tela): se mudou, anima do lugar antigo ao novo.
  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const now = { left: element.offsetLeft, top: element.offsetTop };
    const before = last.current;

    last.current = now;

    if (
      before &&
      (before.left !== now.left || before.top !== now.top) &&
      typeof element.animate === "function"
    ) {
      element.animate(
        [
          {
            transform: `translate(${before.left - now.left}px, ${before.top - now.top}px)`,
          },
          { transform: "translate(0, 0)" },
        ],
        { duration: SLIDE_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
    }
  });

  return (
    <div
      ref={ref}
      draggable
      data-testid="draggable-item"
      className={cn(
        "animate-enter cursor-grab transition-[opacity,scale] duration-200 active:cursor-grabbing [&>*]:h-full",
        // O item arrastado vira um "espaço" no lugar onde vai cair.
        beingDragged && "scale-95 opacity-40",
      )}
      style={{ "--i": index } as CSSProperties}
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        onDragStart(id);
      }}
      onDragEnter={(event: DragEvent) => {
        if (draggingId) {
          event.preventDefault();
          onHover(id);
        }
      }}
      onDragOver={(event: DragEvent) => {
        if (draggingId) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      {children}
    </div>
  );
}
