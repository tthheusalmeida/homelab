import { useEffect, useMemo, useState, type DragEvent } from "react";

import { ChevronRight, FileText, Pencil, Plus } from "lucide-react";

import { Button } from "#ui/button";
import { HexDot, Logo } from "#components/Hex";
import { IconButton } from "#components/IconButton";
import { TruncatedText } from "#components/TruncatedText";
import { cn } from "#lib/utils";
import { normalizeKey } from "#lib/text";

import { canMoveInto, MAX_CATEGORY_LEVELS, sameKeys } from "../categories";
import type { CategoryNode } from "../types/library.types";

/** Uma página que aparece na árvore, dentro da categoria dela. */
export interface TreePage {
  id: string;
  title: string;
  /** A categoria onde a página está (caminho de cima para baixo). */
  category: string[];
}

interface CategoryTreeProps {
  nodes: CategoryNode[];
  /** Caminho selecionado; vazio = todas as categorias. */
  selected: string[];
  onSelect: (path: string[]) => void;
  /** As páginas (publicadas) para mostrar dentro das categorias, como arquivos dentro das pastas. */
  pages?: TreePage[];
  /** Clicar numa página: abrir. */
  onOpenPage?: (page: TreePage) => void;
  /** Com isso, cada categoria ganha um lápis (ao passar o mouse ou focar) que pede para editá-la. */
  onEdit?: (node: CategoryNode) => void;
  /**
   * Com isso, aparece o botão "Nova categoria" no alto (cria no nível principal) e, em cada
   * categoria que ainda tem espaço, um "+" que cria **dentro** dela. `parent` vazio = nível principal.
   */
  onCreate?: (parent: string[]) => void;
  /**
   * Com isso, as categorias podem ser **arrastadas** para dentro de outra (ou para "Todas as
   * categorias", que é o nível principal). `parent` vazio = nível principal.
   */
  onMove?: (node: CategoryNode, parent: string[]) => void;
  /** Com isso, as páginas podem ser **arrastadas** para dentro de uma categoria. */
  onMovePage?: (page: TreePage, parent: string[]) => void;
  /** Travada enquanto algo está sendo movido: nada é arrastado nem editado. */
  disabled?: boolean;
}

/** O que está sendo arrastado: uma categoria (pasta) ou uma página (arquivo). */
type Dragged =
  | { kind: "category"; node: CategoryNode }
  | { kind: "page"; page: TreePage };

const pathKey = (path: string[]) => path.map(normalizeKey).join("\u0000");

/** O caminho e todos os caminhos de cima dele ("A", "A/B" para "A/B"), para abrir os ancestrais. */
function prefixKeys(path: string[]): string[] {
  return path.map((_, index) => pathKey(path.slice(0, index + 1)));
}

/** Linha escolhida: o mesmo realce do item ativo da barra lateral (`primary/15`). */
const ACTIVE_ROW = "bg-primary/15 text-foreground hover:bg-primary/20";

/** Lugar onde o que está sendo arrastado vai cair, se soltar agora. */
const DROP_TARGET = "bg-primary/10 ring-1 ring-primary";

const ROOT_KEY = "\u0000root";

/** O que o rótulo do painel diz enquanto algo é arrastado (curto, para caber numa linha). */
const DROP_HINT = "Solte em uma categoria";

/**
 * Os botões de uma categoria (+ e lápis) ficam à esquerda do contador e só aparecem ao passar o mouse
 * ou ao focar a linha com o teclado; escondidos, não ocupam lugar, e o nome usa a largura toda.
 */
const ACTIONS =
  "hidden shrink-0 items-center group-hover/cat:flex group-focus-within/cat:flex";

/**
 * Árvore de categorias no visual Colmeia, como um explorador de arquivos: as **categorias** são as
 * pastas (hexágono, contagem em mono, setinha) e as **páginas** são os arquivos dentro delas (ícone de
 * documento, texto mais leve, sem contagem). O painel ganha o rótulo mono ("categorias"), a raiz é o
 * conjunto de três hexágonos da marca e os níveis ficam ligados por um fio tracejado.
 *
 * Abrir e fechar é livre: a seta recolhe ou expande qualquer categoria, e clicar numa categoria já
 * escolhida também a recolhe ou expande. Escolher uma categoria abre os níveis de cima dela. Dá para
 * arrastar categorias e páginas para dentro de outra categoria.
 */
export function CategoryTree({
  nodes,
  selected,
  onSelect,
  pages = [],
  onOpenPage,
  onEdit,
  onCreate,
  onMove,
  onMovePage,
  disabled = false,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(prefixKeys(selected)),
  );
  const [dragging, setDragging] = useState<Dragged | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // As páginas de cada categoria, em ordem alfabética.
  const pagesByCategory = useMemo(() => {
    const groups = new Map<string, TreePage[]>();

    for (const page of pages) {
      const key = pathKey(page.category);

      groups.set(key, [...(groups.get(key) ?? []), page]);
    }

    for (const list of groups.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { numeric: true }));
    }

    return groups;
  }, [pages]);

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

  const canDrag = (Boolean(onMove) || Boolean(onMovePage)) && !disabled;

  /** O que está sendo arrastado pode cair em `parent` (vazio = nível principal)? */
  function canDrop(item: Dragged, parent: string[]): boolean {
    if (item.kind === "category") {
      return Boolean(onMove) && canMoveInto(item.node, parent);
    }

    // uma página sempre fica dentro de uma categoria (nunca no nível principal)
    return (
      Boolean(onMovePage) &&
      parent.length > 0 &&
      !sameKeys(item.page.category, parent)
    );
  }

  /** Props de "soltar aqui" para um lugar (uma categoria ou o nível principal). */
  function dropProps(parent: string[], key: string) {
    if (!canDrag) {
      return {};
    }

    return {
      onDragOver: (event: DragEvent) => {
        if (dragging && canDrop(dragging, parent)) {
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

        if (!moved || !canDrop(moved, parent)) {
          return;
        }

        // a categoria de destino se abre, para ver o que chegou
        if (parent.length > 0) {
          open(parent);
        }

        if (moved.kind === "category") {
          onMove?.(moved.node, parent);
        } else {
          onMovePage?.(moved.page, parent);
        }
      },
    };
  }

  function renderPage(page: TreePage) {
    const beingDragged = dragging?.kind === "page" && dragging.page.id === page.id;

    return (
      <li key={page.id}>
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-md",
            beingDragged && "opacity-50",
          )}
          draggable={canDrag && Boolean(onMovePage)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", page.title);
            event.dataTransfer.effectAllowed = "move";
            setDragging({ kind: "page", page });
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
        >
          <span className="size-6 shrink-0" />

          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 flex-1 justify-start gap-2 font-normal text-muted-foreground hover:text-foreground"
            onClick={() => onOpenPage?.(page)}
          >
            <FileText className="size-3.5 shrink-0" aria-hidden />

            <TruncatedText className="text-[13px]">{page.title}</TruncatedText>
          </Button>
        </div>
      </li>
    );
  }

  function renderNode(node: CategoryNode) {
    const key = pathKey(node.path);
    const nodePages = pagesByCategory.get(key) ?? [];
    const hasChildren = node.children.length > 0;
    // Tem o que mostrar dentro: subcategorias ou páginas.
    const hasContent = hasChildren || nodePages.length > 0;
    const isOpen = expanded.has(key);
    const isSelected = key === pathKey(selected);
    const beingDragged =
      dragging?.kind === "category" && pathKey(dragging.node.path) === key;

    function choose() {
      onSelect(node.path);

      if (hasContent) {
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
            isSelected && ACTIVE_ROW,
            over === key && DROP_TARGET,
            beingDragged && "opacity-50",
          )}
          draggable={canDrag && Boolean(onMove)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", node.name);
            event.dataTransfer.effectAllowed = "move";
            setDragging({ kind: "category", node });
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          {...dropProps(node.path, key)}
        >
          {hasContent ? (
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
            className="min-w-0 flex-1 justify-start gap-2 font-medium hover:bg-transparent"
            onClick={choose}
          >
            <HexDot
              className={cn(
                "transition-colors",
                isSelected
                  ? "bg-primary"
                  : hasContent
                    ? "bg-muted-foreground"
                    : "bg-muted-foreground/35",
              )}
            />

            <TruncatedText>{node.name}</TruncatedText>

            {/* A contagem fica fora do botão, na ponta direita; aqui ela só compõe o nome acessível. */}
            <span className="sr-only">{node.count}</span>
          </Button>

          {((onCreate && node.path.length < MAX_CATEGORY_LEVELS) || onEdit) && (
            <div className={ACTIONS}>
              {onCreate && node.path.length < MAX_CATEGORY_LEVELS && (
                <IconButton
                  label={`Nova categoria dentro de ${node.name}`}
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  onClick={() => onCreate(node.path)}
                >
                  <Plus />
                </IconButton>
              )}

              {onEdit && (
                <IconButton
                  label={`Editar a categoria ${node.name}`}
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  onClick={() => onEdit(node)}
                >
                  <Pencil />
                </IconButton>
              )}
            </div>
          )}

          {/* A contagem fica na ponta direita, depois das ações; clicar nela escolhe a categoria. */}
          <span
            aria-hidden="true"
            className="w-7 shrink-0 cursor-pointer pr-2 text-right font-mono text-xs text-muted-foreground tabular-nums"
            onClick={choose}
          >
            {node.count}
          </span>
        </div>

        {hasContent && isOpen && (
          <ul className="animate-enter-fade ml-3 border-l border-dashed border-border pl-0.5">
            {node.children.map((child) => renderNode(child))}
            {nodePages.map((page) => renderPage(page))}
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
        "max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-lg border bg-card p-2 transition-opacity",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex min-h-6 items-center justify-between gap-2 pb-1.5 pl-2">
        {/* Ao arrastar, o aviso troca o rótulo na mesma linha: nada na tela muda de lugar. */}
        <p
          role={dragging ? "status" : undefined}
          aria-hidden={dragging ? undefined : "true"}
          className={cn(
            "truncate font-mono text-[11px] tracking-wider uppercase",
            dragging ? "text-primary" : "text-muted-foreground",
          )}
        >
          {canDrag && dragging ? DROP_HINT : "categorias"}
        </p>

        {onCreate && (
          <IconButton
            label="Nova categoria"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => onCreate([])}
          >
            <Plus />
          </IconButton>
        )}
      </div>

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

      <ul className="mt-1">{nodes.map((node) => renderNode(node))}</ul>
    </nav>
  );
}
