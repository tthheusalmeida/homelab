import { useState } from "react";

import { ChevronRight, Pencil } from "lucide-react";

import { Button } from "#ui/button";
import { HexDot, Logo } from "#components/Hex";
import { IconButton } from "#components/IconButton";
import { cn } from "#lib/utils";
import { normalizeKey } from "#lib/text";

import type { CategoryNode } from "../types/library.types";

interface CategoryTreeProps {
  nodes: CategoryNode[];
  /** Caminho selecionado; vazio = todas as categorias. */
  selected: string[];
  onSelect: (path: string[]) => void;
  /** Com isso, cada categoria ganha um lápis (ao passar o mouse ou focar) que pede para editá-la. */
  onEdit?: (node: CategoryNode) => void;
}

const pathKey = (path: string[]) => path.map(normalizeKey).join("\u0000");

function isPrefix(prefix: string[], path: string[]) {
  return (
    prefix.length <= path.length &&
    prefix.every((name, i) => normalizeKey(name) === normalizeKey(path[i]))
  );
}

/** Linha escolhida: o mesmo realce do item ativo da barra lateral (`primary/15`). */
const ACTIVE_ROW = "bg-primary/15 text-foreground hover:bg-primary/20";

/**
 * Árvore de categorias no visual Colmeia: o painel ganha o rótulo mono ("categorias"), a raiz é o
 * conjunto de três hexágonos da marca, cada categoria tem um hexágono (cheio quando tem
 * subcategorias, vazado quando não, na cor de destaque quando escolhida) e os níveis ficam ligados
 * por um fio tracejado. A contagem é mono, como os rótulos de comando do resto do app.
 */
export function CategoryTree({
  nodes,
  selected,
  onSelect,
  onEdit,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  function renderNode(node: CategoryNode) {
    const hasChildren = node.children.length > 0;
    // Os ancestrais da categoria selecionada ficam sempre abertos.
    const isOpen =
      expanded.has(pathKey(node.path)) || isPrefix(node.path, selected);
    const isSelected = pathKey(node.path) === pathKey(selected);

    return (
      <li key={pathKey(node.path)}>
        <div className="group/cat flex items-center gap-0.5">
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
            onClick={() => onSelect(node.path)}
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
    <nav aria-label="Categorias" className="rounded-lg border bg-card p-2">
      <p
        aria-hidden="true"
        className="px-2 pb-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
      >
        categorias
      </p>

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

      <ul className="mt-1">{nodes.map((node) => renderNode(node))}</ul>
    </nav>
  );
}
