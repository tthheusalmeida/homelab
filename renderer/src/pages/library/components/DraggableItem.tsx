import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";

import { cn } from "#lib/utils";

const SLIDE_MS = 220;

/**
 * Troca a imagem do arrastar (que seria o texto do link) por um "espírito" da página: uma cópia dela,
 * translúcida e com sombra, que acompanha o cursor.
 */
function setGhostImage(event: DragEvent, element: HTMLElement) {
  if (typeof event.dataTransfer.setDragImage !== "function") {
    return;
  }

  const rect = element.getBoundingClientRect();
  const ghost = element.cloneNode(true) as HTMLElement;

  ghost.classList.remove("animate-enter");
  Object.assign(ghost.style, {
    position: "fixed",
    top: "-10000px",
    left: "-10000px",
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    opacity: "0.8",
    animation: "none",
    pointerEvents: "none",
    filter: "drop-shadow(0 10px 18px rgb(0 0 0 / 0.35))",
  });
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(
    ghost,
    event.clientX - rect.left,
    event.clientY - rect.top,
  );
  // O navegador já copiou a imagem; a cópia some no próximo ciclo.
  setTimeout(() => ghost.remove(), 0);
}

interface DraggableItemProps {
  id: string;
  /** Id de quem está sendo arrastado agora (`null` = ninguém). */
  draggingId: string | null;
  onDragStart: (id: string) => void;
  /** Este é o item sob o cursor: ele "levanta a ponta" (a troca só acontece ao soltar). */
  dropTarget: boolean;
  /** O item arrastado passou por cima deste. */
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
  dropTarget,
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
        "animate-enter cursor-grab origin-top-left transition-[opacity,scale,rotate] duration-200 active:cursor-grabbing [&>*]:h-full",
        // O item arrastado vira um "espaço" no lugar onde vai cair.
        beingDragged && "scale-95 opacity-40",
        // Alvo do "soltar": a ponta de cima à esquerda fica fixa e a de baixo à direita sobe, como uma folha
        // levantada, com um brilho leve da marca.
        !beingDragged && dropTarget && "-rotate-3 drop-shadow-md drop-shadow-brand/40",
      )}
      style={{ "--i": index } as CSSProperties}
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);

        if (ref.current) {
          setGhostImage(event, ref.current);
        }

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
