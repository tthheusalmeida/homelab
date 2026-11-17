import { useEffect, type ReactNode } from "react";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "#ui/button";

import { useReadingPreferences } from "#hooks/use-appearance";

import { ReadingSidePanel } from "./ReadingSidePanel";
import { ReadingSurface } from "./ReadingSurface";

interface ReadingModeProps {
  /** Título mostrado na barra de cima (o que está sendo lido). */
  title: string;
  /** Sumário que fica na lateral. */
  toc: ReactNode;
  /** Controles na barra de cima (ex.: busca no texto). */
  actions?: ReactNode;
  /** O texto a ler. */
  children: ReactNode;
  onExit: () => void;
}

/**
 * Modo leitura: cobre a tela com só o texto e o sumário na lateral (sem
 * botões de ação nem cabeçalhos da página). O painel lateral (sumário e ajustes)
 * fica escondido e abre ao passar o mouse na borda direita, a menos que o usuário
 * o fixe em Configurações > Leitura. Esc sai. Usa fonte, tamanho,
 * zoom e cores das preferências de leitura. O texto é desenhado só
 * aqui, nunca junto com a página normal, para não repetir ids de título.
 */
export function ReadingMode({
  title,
  toc,
  actions,
  children,
  onExit,
}: ReadingModeProps) {
  const { reading } = useReadingPreferences();
  const pinned = reading.pinSidebar;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onExit();
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [onExit]);

  return createPortal(
    <ReadingSurface
      framed={false}
      role="region"
      aria-label="Modo leitura"
      className="fixed inset-0 z-50 animate-enter-fade overflow-y-auto bg-background"
    >
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b bg-[var(--reading-bg,var(--background))] px-4 font-sans">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>

        {actions && <div className="w-full max-w-sm">{actions}</div>}

        <Button variant="outline" size="sm" onClick={onExit}>
          <X /> Sair do modo leitura
        </Button>
      </div>

      {pinned ? (
        <div className="mx-auto grid w-full max-w-[calc(24rem+48rem*var(--reading-zoom,1))] gap-10 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">{children}</div>

          <aside
            aria-label="Sumário da leitura"
            className="font-sans lg:sticky lg:top-24 lg:self-start"
          >
            {toc}
          </aside>
        </div>
      ) : (
        <>
          <div className="mx-auto w-full max-w-[calc(4rem+48rem*var(--reading-zoom,1))] px-4 py-10">
            <div className="min-w-0">{children}</div>
          </div>

          <ReadingSidePanel>{toc}</ReadingSidePanel>
        </>
      )}
    </ReadingSurface>,
    document.body,
  );
}
