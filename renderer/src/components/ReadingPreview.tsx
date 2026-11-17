import { MarkdownMessage } from '#components/MarkdownMessage';
import { ModuleDivider } from '#components/ModuleDivider';
import { ReadingSection } from '#components/ReadingSection';
import { ReadingSurface } from '#components/ReadingSurface';
import { useReadingPreferences } from '#hooks/use-appearance';

const SAMPLE = `Uma boa leitura começa por um texto **confortável**: letra no tamanho certo, cores que descansam a vista e uma coluna nem estreita nem larga demais.

Escolha ao lado e veja o resultado aqui, do mesmo jeito que aparece nas [páginas](#) e nos livros.`;

/**
 * Miniatura de como o texto fica com as preferências de leitura: o mesmo desenho das páginas, dos
 * livros e do modo leitura (módulo, capítulo, título e texto). Compacto: rola por dentro se a letra
 * for grande. À direita mostra o painel lateral: só a área de hover (padrão) ou o painel fixo.
 */
export function ReadingPreview() {
  const { reading } = useReadingPreferences();

  return (
    <ReadingSurface
      framed={false}
      aria-label="Pré-visualização da leitura"
      role="region"
      className="flex max-h-60 overflow-hidden rounded-lg border bg-background"
    >
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="reading-column space-y-8 px-6 py-6">
          <ModuleDivider title="Módulo 1" />

          <ReadingSection headingLevel={2} label="Capítulo 1" title="Texto de exemplo">
            <MarkdownMessage content={SAMPLE} size="inherit" />
          </ReadingSection>
        </div>
      </div>

      {reading.pinSidebar ? (
        <div
          data-slot="preview-side-panel"
          className="w-24 shrink-0 space-y-2 border-l p-3 font-sans text-[10px] text-muted-foreground"
        >
          <p className="font-medium">Sumário</p>
          <span aria-hidden className="block h-1 w-full rounded-full bg-foreground/15" />
          <span aria-hidden className="block h-1 w-3/4 rounded-full bg-foreground/15" />
          <span aria-hidden className="block h-1 w-1/2 rounded-full bg-foreground/15" />
        </div>
      ) : (
        <div
          data-slot="preview-hover-area"
          title="Passe o mouse aqui para abrir o painel"
          className="flex w-5 shrink-0 items-center justify-center"
        >
          <span aria-hidden className="h-16 w-1 rounded-full bg-foreground/25" />
        </div>
      )}
    </ReadingSurface>
  );
}
