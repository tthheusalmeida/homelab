import { useEffect, useState, type DragEvent } from "react";

import { ChevronRight, Pencil } from "lucide-react";

import { Button } from "#ui/button";
import { HexDot, Logo } from "#components/Hex";
import { IconButton } from "#components/IconButton";
import { cn } from "#lib/utils";
import { normalizeKey } from "#lib/text";

import { canMoveInto } from "../categories";
import type { CategoryNode } from "../types/library.types";

interface CategoryTreeProps {
  nodes: CategoryNode[];
  /** Caminho selecionado; vazio = todas as categorias. */
  selected: string[];
  onSelect: (path: string[]) => void;
  /** Com isso, cada categoria ganha um lápis (ao passar o mouse ou focar) que pede para editá-la. */
  onEdit?: (node: CategoryNode) => void;
  /**
   * Com isso, as categorias podem ser **arrastadas** para dentro de outra (ou para "Todas as
   * categorias", que é o nível principal). `parent` vazio = nível principal.
   */
  onMove?: (node: CategoryNode, parent: string[]) => void;
  /** Travada enquanto as páginas estão sendo movidas: nada é arrastado nem editado. */
  disabled?: boolean;
}

const pathKey = (path: string[]) => path.map(normalizeKey).join("\u0000");

/** O caminho e todos os caminhos de cima dele ("A", "A/B" para "A/B"), para abrir os ancestrais. */
function prefixKeys(path: string[]): string[] {
  return path.map((_, index) => pathKey(path.slice(0, index + 1)));
}

/** Linha escolhida: o mesmo realce do item ativo da barra lateral (`primary/15`). */
const ACTIVE_ROW = "bg-primary/15 text-foreground hover:bg-primary/20";

/** Lugar onde a categoria arrastada vai cair, se soltar agora. */
const DROP_TARGET = "bg-primary/10 ring-1 ring-primary";

const ROOT_KEY = "\u0000root";

/**
 * Árvore de categorias no visual Colmeia: o painel ganha o rótulo mono ("categorias"), a raiz é o
 * conjunto de três hexágonos da marca, cada categoria tem um hexágono (cheio quando tem
 * subcategorias, vazado quando não, na cor de destaque quando escolhida) e os níveis ficam ligados
 * por um fio tracejado. A contagem é mono, como os rótulos de comando do resto do app.
 *
 * Abrir e fechar é livre: a seta recolhe ou expande qualquer categoria, e clicar numa categoria já
 * escolhida também a recolhe ou expande. Escolher uma categoria abre os níveis de cima dela.
 */
export function CategoryTree({
  nodes,
  selected,
  onSelect,
  onEdit,
  onMove,
  disabled = false,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(prefixKeys(selected)),
  );
  const [dragging, setDragging] = useState<CategoryNode | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Quando a escolha muda (aqui ou em outro lugar da tela), os níveis de cima dela se abrem.
  useEffect(() => {
    setExpanded((current) => {
      const missing = prefixKeys(selected).filter((key) => !current.has(key));

      return missing.length === 0 ? current : new Set([...current, ...missing]);
    });
  }, [selected]);

  function toggle(path: string[]) {
    setExpanded((current) => {
      const next = new Set(current);
      const key = pathKey(path);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function open(path: string[]) {
    setExpanded((current) => new Set(current).add(pathKey(path)));
  }

  const canDrag = Boolean(onMove) && !disabled;

  /** Props de "soltar aqui" para um lugar (uma categoria ou o nível principal). */
  function dropProps(parent: string[], key: string) {
    if (!canDrag) {
      return {};
    }

    return {
      onDragOver: (event: DragEvent) => {
        if (dragging && canMoveInto(dragging, parent)) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOver(key);
        }
      },
      onDragLeave: () => setOver((current) => (current === key ? null : current)),
      onDrop: (event: DragEvent) => {
        event.preventDefault();

        const moved = dragging;

        setDragging(null);
        setOver(null);

        if (moved && canMoveInto(moved, parent)) {
          onMove?.(moved, parent);
        }
      },
    };
  }

  function renderNode(node: CategoryNode) {
    const hasChildren = node.children.length > 0;
    const key = pathKey(node.path);
    const isOpen = expanded.has(key);
    const isSelected = key === pathKey(selected);

    function choose() {
      onSelect(node.path);

      if (hasChildren) {
        // Já escolhida: o clique abre ou fecha. Outra: ela é escolhida e abre.
        if (isSelected) {
          toggle(node.path);
        } else {
          open(node.path);
        }
      }
    }

    return (
      <li key={key}>
        <div
          className={cn(
            "group/cat flex items-center gap-0.5 rounded-md transition-colors",
            over === key && DROP_TARGET,
            dragging && pathKey(dragging.path) === key && "opacity-50",
          )}
          draggable={canDrag}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", node.name);
            event.dataTransfer.effectAllowed = "move";
            setDragging(node);
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          {...dropProps(node.path, key)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${isOpen ? "Recolher" : "Expandir"} ${node.name}`}
              aria-expanded={isOpen}
              onClick={() => toggle(node.path)}
            >
              <ChevronRight
                className={cn("transition-transform", isOpen && "rotate-90")}
              />
            </Button>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <Button
            variant="ghost"
            size="sm"
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "min-w-0 flex-1 justify-start gap-2",
              isSelected && ACTIVE_ROW,
            )}
            onClick={choose}
          >
            <HexDot
              className={cn(
                "transition-colors",
                isSelected
                  ? "bg-primary"
                  : hasChildren
                    ? "bg-muted-foreground"
                    : "bg-muted-foreground/35",
              )}
            />

            <span className="truncate">{node.name}</span>

            <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
              {node.count}
            </span>
          </Button>

          {onEdit && (
            <IconButton
              label={`Editar a categoria ${node.name}`}
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              className="shrink-0 opacity-0 transition-opacity group-hover/cat:opacity-100 focus-visible:opacity-100"
              onClick={() => onEdit(node)}
            >
              <Pencil />
            </IconButton>
          )}
        </div>

        {hasChildren && isOpen && (
          <ul className="animate-enter-fade ml-3 border-l border-dashed border-border pl-0.5">
            {node.children.map((child) => renderNode(child))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <nav
      aria-label="Categorias"
      aria-busy={disabled || undefined}
      className={cn(
        "rounded-lg border bg-card p-2 transition-opacity",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <p
        aria-hidden="true"
        className="px-2 pb-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
      >
        categorias
      </p>

      <div
        className={cn("rounded-md transition-colors", over === ROOT_KEY && DROP_TARGET)}
        {...dropProps([], ROOT_KEY)}
      >
        <Button
          variant="ghost"
          size="sm"
          aria-current={selected.length === 0 ? "true" : undefined}
          className={cn(
            "w-full justify-start gap-2",
            selected.length === 0 && ACTIVE_ROW,
          )}
          onClick={() => onSelect([])}
        >
          <Logo className="size-4" />
          Todas as categorias
        </Button>
      </div>

      {canDrag && dragging && (
        <p className="px-2 pt-1 text-[11px] text-muted-foreground">
          Solte em uma categoria (ou em Todas as categorias) para mover.
        </p>
      )}

      <ul className="mt-1">{nodes.map((node) => renderNode(node))}</ul>
    </nav>
  );
}
