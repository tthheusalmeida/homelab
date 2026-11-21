import { MarkdownMessage } from '#components/MarkdownMessage';
import { ModuleDivider } from '#components/ModuleDivider';
import { ReadingSection } from '#components/ReadingSection';
import { ReadingSurface } from '#components/ReadingSurface';
import { useReadingPreferences } from '#hooks/use-appearance';
import { cn } from '#lib/utils';

const SAMPLE = `Uma boa leitura começa por um texto **confortável**: letra no tamanho certo, cores que descansam a vista e uma coluna nem estreita nem larga demais.

Escolha ao lado e veja o resultado aqui, do mesmo jeito que aparece nas [páginas](#) e nos livros.`;

/** Quadro do painel (progresso, leitura, sumário) em miniatura, com o mesmo estilo do real. */
function MiniCard({ title, lines }: { title: string; lines: number }) {
  return (
    <div className="sidebar-card space-y-1 rounded-md p-1.5">
      <p className="text-[9px] font-semibold text-foreground">{title}</p>

      {Array.from({ length: lines }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className="block h-0.5 rounded-full bg-foreground/30"
          style={{ width: `${100 - index * 22}%` }}
        />
      ))}
    </div>
  );
}

type Side = 'follow' | 'options';

/** Os cartões de cada lado: acompanhamento (sumário) e opções (ajustes), como no modo leitura. */
function SideCards({ side }: { side: Side }) {
  return side === 'follow' ? (
    <MiniCard title="Sumário" lines={3} />
  ) : (
    <>
      <MiniCard title="Leitura" lines={2} />
      <MiniCard title="Sobre a página" lines={1} />
    </>
  );
}

/**
 * Um lado da miniatura. Com o painel fixo mostra os cartões; senão é a margem que, ao passar o
 * mouse, revela os cartões (como o modo leitura de verdade, sem botão).
 */
function PreviewSide({
  side,
  edge,
  pinned,
}: {
  side: Side;
  /** Borda em que a margem fica: os cartões abrem para dentro, sem passar do quadro. */
  edge: 'left' | 'right';
  pinned: boolean;
}) {
  const label = side === 'follow' ? 'Acompanhamento' : 'Opções';

  if (pinned) {
    return (
      <div data-slot="preview-side-panel" data-side={side} className="w-24 shrink-0 space-y-1.5 p-2 font-sans">
        <SideCards side={side} />
      </div>
    );
  }

  return (
    <div
      data-slot="preview-hover-area"
      data-side={side}
      className="group relative w-12 shrink-0 font-sans"
    >
      <span
        aria-hidden
        className="absolute top-3 left-1/2 -translate-x-1/2 text-[7px] uppercase tracking-wider text-muted-foreground transition-opacity [writing-mode:vertical-rl] group-hover:opacity-0"
      >
        {label}
      </span>

      <div
        className={cn(
          'absolute top-1 z-10 w-24 space-y-1.5 p-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          edge === 'left' ? 'left-1' : 'right-1',
        )}
      >
        <SideCards side={side} />
      </div>
    </div>
  );
}

/**
 * Miniatura fiel do modo leitura com as preferências: cabeçalho na moldura suave (`reading-chrome`),
 * os mesmos cartões (`sidebar-card`) e o texto no mesmo desenho (módulo, capítulo, título e texto).
 * Os dois lados seguem as opções: com o painel fixo os cartões ficam sempre visíveis; senão
 * aparecem ao passar o mouse na margem (acompanhamento à esquerda e opções à direita, ou o
 * contrário com "Acompanhamento à direita e opções à esquerda"). Tem **altura fixa** e corta o que passar (com um esmaecido
 * embaixo): fonte, tamanho e zoom grandes não podem esticar o quadro nem empurrar o que vem abaixo.
 */
export function ReadingPreview() {
  const { reading } = useReadingPreferences();
  const left: Side = reading.swapSides ? 'options' : 'follow';
  const right: Side = reading.swapSides ? 'follow' : 'options';

  return (
    <ReadingSurface
      framed={false}
      aria-label="Pré-visualização da leitura"
      role="region"
      className="relative flex h-80 min-w-0 flex-col overflow-hidden rounded-lg border bg-background"
    >
      <div className="reading-chrome flex h-7 shrink-0 items-center justify-between border-b px-3 font-sans text-[10px]">
        <span className="font-medium">Título do livro</span>

        <span>Sair do modo leitura</span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <PreviewSide side={left} edge="left" pinned={reading.pinSidebar} />

        <div className="reading-column min-w-0 flex-1 space-y-5 overflow-hidden py-4">
          <ModuleDivider title="Módulo 1" />

          <ReadingSection headingLevel={2} label="Capítulo 1" title="Texto de exemplo">
            <MarkdownMessage content={SAMPLE} size="inherit" />
          </ReadingSection>
        </div>

        <PreviewSide side={right} edge="right" pinned={reading.pinSidebar} />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
      />
    </ReadingSurface>
  );
}
