import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FileText, Search, type LucideIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
import { useDebouncedValue } from "#hooks/use-debounced-value";
import { goShortcutLabel } from "#lib/shortcuts";
import { cn } from "#lib/utils";

import { useDocuments } from "../pages/library/hooks/useLibrary";

import { navigation } from "./AppSidebar";

/** Mínimo de letras para buscar nas páginas da biblioteca. */
export const PALETTE_MIN_QUERY = 2;
const MAX_DOCUMENTS = 6;

const Texts = {
  title: "Paleta de comandos",
  description: "Vá para uma tela ou encontre uma página da biblioteca.",
  placeholder: "Buscar telas e páginas...",
  screens: "Telas",
  pages: "Páginas da biblioteca",
  empty: "Nada encontrado.",
  searching: "Buscando páginas...",
  hint: "↑↓ navegar · Enter abrir · Esc fechar",
} as const;

interface PaletteItem {
  id: string;
  title: string;
  hint?: string;
  url: string;
  icon: LucideIcon;
  group: "screens" | "pages";
}

const screenItems: PaletteItem[] = navigation.flatMap((group) =>
  group.items.map((item) => ({
    id: item.url,
    title: group.label ? `${group.label} · ${item.title}` : item.title,
    hint: goShortcutLabel(item.url),
    url: item.url,
    icon: item.icon,
    group: "screens" as const,
  })),
);

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Paleta de comandos (`Ctrl+K`): vai para qualquer tela do menu e busca páginas da biblioteca pelo
 * texto. Setas movem a seleção, Enter abre e Esc fecha.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 250);
  const searching = debounced.length >= PALETTE_MIN_QUERY;
  const documents = useDocuments({ q: debounced, sort: "recent" }, { enabled: open && searching });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const text = normalize(query.trim());
    const screens = text
      ? screenItems.filter((item) => normalize(item.title).includes(text))
      : screenItems;
    const pages: PaletteItem[] = searching
      ? (documents.data ?? []).slice(0, MAX_DOCUMENTS).map((document) => ({
          id: `doc:${document.id}`,
          title: document.title,
          hint: document.category.join(" / "),
          url: `/library/${document.id}`,
          icon: FileText,
          group: "pages" as const,
        }))
      : [];

    return [...screens, ...pages];
  }, [query, searching, documents.data]);

  useEffect(() => setSelected(0), [query]);

  const choose = (item: PaletteItem | undefined) => {
    if (!item) {
      return;
    }

    onOpenChange(false);
    void navigate(item.url);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((current) => Math.min(current + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(items[selected]);
    }
  };

  const groups = (["screens", "pages"] as const).map((group) => ({
    group,
    entries: items.map((item, index) => ({ item, index })).filter(({ item }) => item.group === group),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        bodyClassName="gap-0 overflow-visible p-0"
        className="top-[20%] translate-y-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">{Texts.title}</DialogTitle>
        <DialogDescription className="sr-only">{Texts.description}</DialogDescription>

        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />

          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="command-palette-list"
            aria-label={Texts.placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={Texts.placeholder}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div id="command-palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searching && documents.isFetching ? Texts.searching : Texts.empty}
            </p>
          )}

          {groups.map(
            ({ group, entries }) =>
              entries.length > 0 && (
                <div key={group} role="group" aria-label={Texts[group]} className="mb-1">
                  <p className="px-3 py-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                    {Texts[group]}
                  </p>

                  {entries.map(({ item, index }) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === selected}
                      onMouseMove={() => setSelected(index)}
                      onClick={() => choose(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
                        index === selected && "bg-muted",
                      )}
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>

                      {item.hint && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ),
          )}
        </div>

        <p className="border-t px-3 py-2 font-mono text-[11px] text-muted-foreground">{Texts.hint}</p>
      </DialogContent>
    </Dialog>
  );
}
