import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { Button } from '#ui/button';

import { ReadingSideToggle } from './ReadingSideToggle';

/** Duração da saída (a mesma de `--duration-exit`): depois dela o painel sai da árvore. */
const EXIT_MS = 240;

/**
 * Painel lateral do modo leitura quando ele não está fixo: só uma aba hexagonal com ícone de
 * painel fica à mostra, no topo da borda direita (logo abaixo do cabeçalho) mas à esquerda da barra de rolagem (não fica por cima
 * dela); com o painel aberto ela acompanha a borda dele, sem sumir por baixo. Clicar na aba abre o painel por cima do texto (`animate-enter-right`); ele fecha pelo
 * botão "Fechar painel", clicando fora ou clicando na aba de novo, sempre com a transição de saída
 * (`animate-exit-right`). A barra de rolagem continua livre nos dois estados.
 */
export function ReadingSidePanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Fechando: o painel ainda está na tela, saindo com a transição.
  const [leaving, setLeaving] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const tab = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const openPanel = () => {
    window.clearTimeout(timer.current);
    setLeaving(false);
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    setLeaving(true);
    window.clearTimeout(timer.current);
    // Reserva para quando o navegador não dispara o fim da animação (movimento reduzido).
    timer.current = window.setTimeout(() => setLeaving(false), EXIT_MS + 60);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Clique fora do painel fecha (a aba fica de fora de propósito: ela mesma alterna).
  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      // A aba alterna sozinha (no clique); se o pointerdown também fechasse, ela reabriria.
      if (!panel.current?.contains(target) && !tab.current?.contains(target)) {
        closePanel();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);

    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <>
      <ReadingSideToggle
        ref={tab}
        open={open}
        // No topo, logo abaixo do cabeçalho; com o painel aberto acompanha a borda dele.
        className={`fixed top-[4.5rem] transition-[right] duration-300 ease-out ${
          open ? 'right-[21.25rem]' : 'right-5'
        }`}
        onClick={() => (open ? closePanel() : openPanel())}
      />

      {(open || leaving) && (
        <aside
          ref={panel}
          aria-label="Sumário da leitura"
          data-state={open ? 'open' : 'closing'}
          className={`fixed top-14 right-3 bottom-0 z-20 w-80 max-w-[85vw] reading-chrome overflow-y-auto border-l p-4 font-sans shadow-xl ${
            open ? 'animate-enter-right' : 'pointer-events-none animate-exit-right'
          }`}
          onAnimationEnd={() => {
            if (!open) {
              window.clearTimeout(timer.current);
              setLeaving(false);
            }
          }}
        >
          <div className="mb-2 flex justify-end">
            <Button type="button" variant="ghost" size="xs" onClick={closePanel}>
              <X /> Fechar painel
            </Button>
          </div>

          {children}
        </aside>
      )}
    </>
  );
}
