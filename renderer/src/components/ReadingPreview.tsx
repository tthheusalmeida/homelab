import { MarkdownMessage } from '#components/MarkdownMessage';
import { ModuleDivider } from '#components/ModuleDivider';
import { ReadingSection } from '#components/ReadingSection';
import { ReadingSideToggle } from '#components/ReadingSideToggle';
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

/**
 * Miniatura fiel do modo leitura com as preferências: cabeçalho e painel na mesma moldura suave
 * (`reading-chrome`) e os mesmos quadros (`sidebar-card`) do real, o texto no mesmo desenho
 * (módulo, capítulo, título e texto), o
 * mesmo botão (`ReadingSideToggle`) no topo, à direita, que abre o painel. Com a opção do painel fixo marcada, mostra o
 * painel ao lado do texto no lugar da aba. Sem rolagem: mostra tudo de uma vez.
 */
export function ReadingPreview() {
  const { reading } = useReadingPreferences();

  return (
    <div className="relative">
      <ReadingSurface
        framed={false}
        aria-label="Pré-visualização da leitura"
        role="region"
        className="flex flex-col overflow-hidden rounded-lg border bg-background"
      >
        <div className="reading-chrome flex h-7 shrink-0 items-center justify-between border-b px-3 font-sans text-[10px]">
          <span className="font-medium">Título do livro</span>

          <span>Sair do modo leitura</span>
        </div>

        <div className="flex">
          <div
            className={cn(
              'reading-column min-w-0 flex-1 space-y-5 py-4 pl-5',
              // Com o painel escondido, reserva o lugar do botão para ele não cobrir o texto.
              reading.pinSidebar ? 'pr-5' : 'pr-14',
            )}
          >
            <ModuleDivider title="Módulo 1" />

            <ReadingSection headingLevel={2} label="Capítulo 1" title="Texto de exemplo">
              <MarkdownMessage content={SAMPLE} size="inherit" />
            </ReadingSection>
          </div>

          {reading.pinSidebar && (
            <div
              data-slot="preview-side-panel"
              className="reading-chrome w-28 shrink-0 space-y-1.5 border-l p-2 font-sans"
            >
              <MiniCard title="Conclusão" lines={1} />
              <MiniCard title="Leitura" lines={2} />
              <MiniCard title="Sumário" lines={3} />
            </div>
          )}
        </div>
      </ReadingSurface>

      {!reading.pinSidebar && (
        <div
          data-slot="preview-hover-area"
          title="Clique no botão para abrir o painel"
          // Mesma posição do real: no topo, logo abaixo do cabeçalho, à direita.
          className="pointer-events-none absolute top-9 right-5"
        >
          <ReadingSideToggle preview />
        </div>
      )}
    </div>
  );
}
