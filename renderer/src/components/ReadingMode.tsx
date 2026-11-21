import { useEffect, type ReactNode } from 'react';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { Button } from '#ui/button';

import { useReadingPreferences } from '#hooks/use-appearance';
import { cn } from '#lib/utils';

import { ReadingSidePanel } from './ReadingSidePanel';
import { ReadingSurface } from './ReadingSurface';

interface ReadingModeProps {
  /** Título mostrado na barra de cima (o que está sendo lido). */
  title: string;
  /** Acompanhamento ("onde você está": sumário, linha do tempo). Opcional: nem todo texto tem. */
  follow?: ReactNode;
  /** Opções (ajustes de leitura, progresso, ações). Não usadas no modo `canvas`. */
  options?: ReactNode;
  /**
   * Em vez de uma coluna de texto, o conteúdo ocupa **toda a área** abaixo da barra de cima, sem
   * painéis laterais nem rolagem própria (ex.: o mapa mental, que tem a sua barra de controles). As
   * opções de leitura (fonte, tamanho, zoom) não valem para ele, então não há `follow` nem `options`.
   */
  canvas?: boolean;
  /** Controles na barra de cima (ex.: busca no texto). */
  actions?: ReactNode;
  /** O texto a ler. */
  children: ReactNode;
  onExit: () => void;
}

/**
 * Modo leitura: cobre a tela com só o texto (sem botões de ação nem cabeçalhos da página). O que
 * acompanha a leitura (`follow`) e as opções (`options`) ficam separados como na página, sem
 * moldura de painel, só os cartões: acompanhamento à esquerda do texto e opções à direita (ou o contrário, com "Acompanhamento à direita e opções à esquerda" em Configurações > Leitura). Com o
 * painel fixo (Configurações > Leitura) ficam sempre visíveis; senão aparecem ao passar o mouse na
 * margem vazia de cada lado (`ReadingSidePanel`), sem botão. Esc sai. Usa fonte, tamanho, zoom e
 * cores das preferências de leitura. O texto é desenhado só aqui, nunca junto com a página normal,
 * para não repetir ids de título.
 */
export function ReadingMode({
  title,
  follow,
  options,
  actions,
  canvas = false,
  children,
  onExit,
}: ReadingModeProps) {
  const { reading } = useReadingPreferences();
  const pinned = reading.pinSidebar;
  // "Acompanhamento à direita e opções à esquerda": o acompanhamento vai para a direita e as opções para a esquerda.
  const swapped = reading.swapSides;
  const followSide = swapped ? 'right' : 'left';
  const optionsSide = swapped ? 'left' : 'right';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExit();
      }
    };

    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);
  }, [onExit]);

  return createPortal(
    <ReadingSurface
      framed={false}
      role="region"
      aria-label="Modo leitura"
      className={cn(
        'fixed inset-0 z-50 animate-enter-fade bg-background',
        canvas ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
      )}
    >
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-3 reading-chrome border-b px-4 font-sans">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>

        {actions && <div className="w-full max-w-sm">{actions}</div>}

        <Button variant="outline" size="sm" onClick={onExit}>
          <X /> Sair do modo leitura
        </Button>
      </div>

      {canvas ? (
        // A barra flutuante (mapa mental, infográfico) fica na mesma altura do modo normal; ver `FloatingToolbar`.
        <div className="min-h-0 flex-1 [--floating-toolbar-bottom:1.25rem]">{children}</div>
      ) : pinned ? (
        <div
          className={cn(
            'mx-auto grid w-full gap-10 px-4 py-10',
            follow
              ? 'max-w-[calc(45rem+48rem*var(--reading-zoom,1))]'
              : 'max-w-[calc(24rem+48rem*var(--reading-zoom,1))]',
            // O que está à esquerda vem primeiro; as colunas seguem a largura de cada lado.
            follow
              ? swapped
                ? 'lg:grid-cols-[18rem_minmax(0,1fr)_21rem]'
                : 'lg:grid-cols-[21rem_minmax(0,1fr)_18rem]'
              : swapped
                ? 'lg:grid-cols-[18rem_minmax(0,1fr)]'
                : 'lg:grid-cols-[minmax(0,1fr)_18rem]',
          )}
        >
          {follow && (
            <aside
              aria-label="Acompanhamento da leitura"
              className={cn(
                'reading-chrome space-y-2 font-sans lg:sticky lg:top-24 lg:self-start !bg-transparent',
                swapped ? 'lg:order-3' : 'lg:order-1',
              )}
            >
              {follow}
            </aside>
          )}

          <div className="min-w-0 lg:order-2">{children}</div>

          <aside
            aria-label="Opções da leitura"
            className={cn(
              'reading-chrome space-y-2 font-sans lg:sticky lg:top-24 lg:self-start !bg-transparent',
              swapped ? 'lg:order-1' : 'lg:order-3',
            )}
          >
            {options}
          </aside>
        </div>
      ) : (
        <>
          <div className="mx-auto w-full max-w-[calc(8rem+48rem*var(--reading-zoom,1))] px-4 py-10 sm:px-16">
            <div className="min-w-0">{children}</div>
          </div>

          {follow && (
            <ReadingSidePanel
              side={followSide}
              label="Acompanhamento da leitura"
              width="w-[19rem]"
            >
              {follow}
            </ReadingSidePanel>
          )}

          <ReadingSidePanel side={optionsSide} label={follow ? 'Opções da leitura' : undefined}>
            {options}
          </ReadingSidePanel>
        </>
      )}
    </ReadingSurface>,
    document.body,
  );
}
