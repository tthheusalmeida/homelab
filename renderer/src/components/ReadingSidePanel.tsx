import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Tempo para fechar depois que o mouse sai: evita piscar ao ir da borda para o painel. */
const CLOSE_DELAY_MS = 200;

/**
 * Painel lateral do modo leitura quando ele não está fixo: só a borda direita fica à mostra (uma
 * alça discreta). Passar o mouse nela, ou focá-la pelo teclado, abre o painel por cima do texto;
 * ele fica aberto enquanto o mouse (ou o foco) estiver na borda ou no painel e fecha ao sair.
 */
export function ReadingSidePanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = () => {
    window.clearTimeout(timer.current);
    setOpen(true);
  };

  const hideSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        aria-label="Mostrar painel lateral"
        aria-expanded={open}
        className="group fixed top-14 right-0 bottom-0 z-20 flex w-5 cursor-pointer items-center justify-center outline-none"
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onClick={show}
      >
        <span
          aria-hidden
          className="h-16 w-1 rounded-full bg-foreground/25 transition-colors group-hover:bg-foreground/50 group-focus-visible:bg-primary"
        />
      </button>

      {open && (
        <aside
          aria-label="Sumário da leitura"
          className="fixed top-14 right-0 bottom-0 z-20 w-80 max-w-[85vw] animate-enter-right overflow-y-auto border-l bg-[var(--reading-bg,var(--background))] p-4 font-sans shadow-xl"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              hideSoon();
            }
          }}
        >
          {children}
        </aside>
      )}
    </>
  );
}
