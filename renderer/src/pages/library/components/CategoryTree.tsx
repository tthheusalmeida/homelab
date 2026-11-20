import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { FileText, Pencil, Plus } from "lucide-react";

import { Button } from "#ui/button";
import { hexPath, Logo } from "#components/Hex";
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
  /**
   * Com isso, o que está **aberto** fica guardado no navegador (localStorage) com esse nome: abrir uma
   * página sai desta tela, e ao voltar as categorias que estavam abertas continuam abertas.
   */
  persistKey?: string;
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

/** O que estava aberto, lido do navegador (vazio se não há nada ou se está ilegível). */
function readOpen(key: string | undefined): string[] {
  if (!key) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * O hexágono da pasta, que é também a seta de abrir e fechar (um ícone só): **cheio** quando a pasta
 * está fechada, **vazado** quando está aberta, na cor de destaque quando é a escolhida e esmaecido
 * quando a pasta está vazia.
 */
function FolderHex({
  open,
  tone,
}: {
  open: boolean;
  tone: "selected" | "normal" | "empty";
}) {
  return (
    <svg
      viewBox="0 0 12 14"
      aria-hidden="true"
      data-state={open ? "open" : "closed"}
      className={cn(
        "h-3.5 w-3 shrink-0 transition-colors",
        tone === "selected" && "text-primary",
        tone === "normal" && "text-muted-foreground",
        tone === "empty" && "text-muted-foreground/35",
      )}
    >
      <path
        d={hexPath(6, 7, 5.6)}
        fill={open ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Onde um item está na lista de um nível aberto (o primeiro nível não tem traço). */
type Branch = "middle" | "last";

/**
 * O traço que liga um item aninhado à categoria de cima: nos do meio, uma linha reta que desce pela
 * altura toda do item (e dos subníveis dele); no **último**, a linha desce só até o meio da linha do
 * item e faz uma **curva** para dentro (o canto de uma árvore de pastas). A altura `h-4` é a metade
 * da linha (`h-8`).
 */
function BranchLine({ branch }: { branch: Branch }) {
  return (
    <span
      aria-hidden="true"
      data-branch={branch}
      className={cn(
        "pointer-events-none absolute left-0 border-border",
        branch === "last"
          ? "top-0 h-4 w-1.5 rounded-bl-md border-b border-l"
          : "inset-y-0 border-l",
      )}
    />
  );
}

/** Linha escolhida: o mesmo realce do item ativo da barra lateral (`primary/15`). */
const ACTIVE_ROW = "bg-primary/15 text-foreground hover:bg-primary/20";

/** Passar o mouse numa linha: uma variante mais clara da cor de destaque (a da linha escolhida é mais forte). */
const ROW_HOVER = "hover:bg-primary/10";

/**
 * A área clicável de uma linha (ícone e nome): um elemento nu, **sem visual próprio** (sem fundo,
 * sem hover, sem estado aberto). Quem desenha o fundo, o hover e a escolha é a linha inteira; assim
 * o ícone, o nome e o contador reagem juntos, como uma coisa só. Só o anel de foco do teclado é dele.
 */
const ROW_CLICK =
  "flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

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
 * pastas (uma linha só, clicável inteira: hexágono, nome e contagem; botão separado só nas ações) e as **páginas** são os arquivos dentro delas
 * (ícone de documento, texto mais leve, sem contagem, mais perto da borda esquerda). O painel ganha o rótulo mono ("categorias"), a raiz é o
 * conjunto de três hexágonos da marca e os níveis ficam ligados por um traço fino que termina numa curva no último item de cada nível.
 *
 * Abrir e fechar é livre: clicar numa pasta a escolhe e a abre ou fecha, esteja ela escolhida ou não. Escolher uma categoria abre os níveis de cima dela. Dá para
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
  persistKey,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([...readOpen(persistKey), ...prefixKeys(selected)]),
  );
  // A pasta em que o usuário acabou de clicar (para a escolha não reabrir o que o clique fechou).
  const clicked = useRef<string | null>(null);
  const [dragging, setDragging] = useState<Dragged | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // O que está aberto fica guardado para quando a tela voltar (abrir uma página sai dela).
  useEffect(() => {
    if (!persistKey) {
      return;
    }

    try {
      window.localStorage.setItem(persistKey, JSON.stringify([...expanded]));
    } catch {
      // sem armazenamento: vale só enquanto a tela está aberta
    }
  }, [expanded, persistKey]);

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

  // Quando a escolha muda (aqui ou em outro lugar da tela), os níveis de cima dela se abrem, e ela
  // também, se a mudança não veio de um clique nela (o clique já abriu ou fechou a pasta).
  useEffect(() => {
    const keys = prefixKeys(selected);
    const wanted = clicked.current === keys[keys.length - 1] ? keys.slice(0, -1) : keys;

    clicked.current = null;

    setExpanded((current) => {
      const missing = wanted.filter((key) => !current.has(key));

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

  function renderPage(page: TreePage, branch: Branch) {
    const beingDragged = dragging?.kind === "page" && dragging.page.id === page.id;

    return (
      <li key={page.id} className="relative pl-1.5">
        <BranchLine branch={branch} />

        <div
          className={cn(
            "group/page flex items-center gap-0.5 rounded-md transition-colors",
            ROW_HOVER,
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
          <button
            type="button"
            className={cn(
              ROW_CLICK,
              "font-normal text-muted-foreground group-hover/page:text-foreground",
            )}
            onClick={() => onOpenPage?.(page)}
          >
            <FileText className="size-3.5 shrink-0" aria-hidden />

            <TruncatedText className="text-[13px]">{page.title}</TruncatedText>
          </button>
        </div>
      </li>
    );
  }

  function renderNode(node: CategoryNode, branch?: Branch) {
    const key = pathKey(node.path);
    const nodePages = pagesByCategory.get(key) ?? [];
    const hasChildren = node.children.length > 0;
    // Tem o que mostrar dentro: subcategorias ou páginas.
    const hasContent = hasChildren || nodePages.length > 0;
    const isOpen = expanded.has(key);
    const isSelected = key === pathKey(selected);
    const beingDragged =
      dragging?.kind === "category" && pathKey(dragging.node.path) === key;

    // Clicar na pasta (o ícone, o nome ou o contador: é uma coisa só) escolhe a categoria e, se ela
    // tem o que mostrar, abre ou fecha.
    function choose() {
      clicked.current = key;
      onSelect(node.path);

      if (hasContent) {
        toggle(node.path);
      }
    }

    // Dentro de uma categoria aberta: primeiro as subcategorias, depois as páginas; o último da lista
    // (seja pasta ou página) é o que leva a curva.
    const entries = [
      ...node.children.map((child) => ({ child }) as const),
      ...nodePages.map((page) => ({ page }) as const),
    ];

    return (
      <li key={key} className={cn(branch && "relative pl-1.5")}>
        {branch && <BranchLine branch={branch} />}

        <div
          className={cn(
            "group/cat flex items-center gap-0.5 rounded-md transition-colors",
            isSelected ? ACTIVE_ROW : ROW_HOVER,
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
          <button
            type="button"
            aria-current={isSelected ? "true" : undefined}
            aria-expanded={hasContent ? isOpen : undefined}
            className={cn(ROW_CLICK, "font-medium")}
            onClick={choose}
          >
            <FolderHex
              open={hasContent && isOpen}
              tone={isSelected ? "selected" : hasContent ? "normal" : "empty"}
            />

            <TruncatedText>{node.name}</TruncatedText>

            {/* A contagem aparece na ponta direita da linha; aqui ela só compõe o nome acessível. */}
            <span className="sr-only">{node.count}</span>
          </button>

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
          <ul className="animate-enter-fade ml-2.5">
            {entries.map((entry, index) => {
              const position: Branch = index === entries.length - 1 ? "last" : "middle";

              return "child" in entry
                ? renderNode(entry.child, position)
                : renderPage(entry.page, position);
            })}
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
        className={cn(
          "flex items-center rounded-md transition-colors",
          selected.length === 0 ? ACTIVE_ROW : ROW_HOVER,
          over === ROOT_KEY && DROP_TARGET,
        )}
        {...dropProps([], ROOT_KEY)}
      >
        <button
          type="button"
          aria-current={selected.length === 0 ? "true" : undefined}
          className={ROW_CLICK}
          onClick={() => onSelect([])}
        >
          <Logo className="size-4" />
          Todas as categorias
        </button>
      </div>

      <ul className="mt-1">{nodes.map((node) => renderNode(node))}</ul>
    </nav>
  );
}
