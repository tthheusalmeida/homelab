import { MarkdownMessage } from '#components/MarkdownMessage';
import { ModuleDivider } from '#components/ModuleDivider';
import { ReadingSection } from '#components/ReadingSection';
import { ReadingSurface } from '#components/ReadingSurface';

const SAMPLE = `Uma boa leitura começa por um texto **confortável**: letra no tamanho certo, cores que descansam a vista e uma coluna nem estreita nem larga demais.

Escolha ao lado e veja o resultado aqui, do mesmo jeito que aparece nas [páginas](#) e nos livros.`;

/**
 * Miniatura de como o texto fica com as preferências de leitura: o mesmo desenho das páginas, dos
 * livros e do modo leitura (módulo, capítulo, título e texto). Compacto: rola por dentro se a letra
 * for grande.
 */
export function ReadingPreview() {
  return (
    <ReadingSurface
      framed={false}
      aria-label="Pré-visualização da leitura"
      role="region"
      className="max-h-60 overflow-y-auto rounded-lg border bg-background"
    >
      <div className="reading-column space-y-8 px-6 py-6">
        <ModuleDivider title="Módulo 1" />

        <ReadingSection headingLevel={2} label="Capítulo 1" title="Texto de exemplo">
          <MarkdownMessage content={SAMPLE} size="inherit" />
        </ReadingSection>
      </div>
    </ReadingSurface>
  );
}
