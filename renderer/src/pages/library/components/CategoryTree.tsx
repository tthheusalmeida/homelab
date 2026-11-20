import { useState } from "react";

import { ChevronRight, Pencil } from "lucide-react";

import { Button } from "#ui/button";
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

  function renderNode(node: CategoryNode, depth: number) {
    const hasChildren = node.children.length > 0;
    // Os ancestrais da categoria selecionada ficam sempre abertos.
    const isOpen =
      expanded.has(pathKey(node.path)) || isPrefix(node.path, selected);
    const isSelected = pathKey(node.path) === pathKey(selected);

    return (
      <li key={pathKey(node.path)}>
        <div
          className="group/cat flex items-center gap-0.5"
          style={{ paddingLeft: `${depth * 12}px` }}
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
            variant={isSelected ? "secondary" : "ghost"}
            size="sm"
            aria-current={isSelected ? "true" : undefined}
            className="min-w-0 flex-1 justify-between"
            onClick={() => onSelect(node.path)}
          >
            <span className="truncate">{node.name}</span>

            <span className="text-xs text-muted-foreground">{node.count}</span>
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
          <ul className="animate-enter-fade">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <nav aria-label="Categorias">
      <Button
        variant={selected.length === 0 ? "secondary" : "ghost"}
        size="sm"
        aria-current={selected.length === 0 ? "true" : undefined}
        className="w-full justify-start"
        onClick={() => onSelect([])}
      >
        Todas as categorias
      </Button>

      <ul className="mt-1">{nodes.map((node) => renderNode(node, 0))}</ul>
    </nav>
  );
}
