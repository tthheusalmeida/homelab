import { Card, CardContent, CardHeader, CardTitle } from '#ui/card';
import { useSummaryPreferences } from '#hooks/use-appearance';
import { extractHeadings } from '#lib/markdown';

import { MarkdownMessage } from './MarkdownMessage';
import { OutlineNav } from './OutlineNav';
import { PreviewFrame } from './PreviewFrame';
import { ReadingSection } from './ReadingSection';

const SAMPLE = `## Ideia central

O resumo reúne o essencial da aula em poucos parágrafos.

## Conceitos

Cada título vira um item do sumário, e o que você está lendo fica em destaque.

## Aplicação

Use o sumário para pular direto para o ponto que procura.`;

/**
 * Miniatura do resumo: o texto e o Sumário (os mesmos `OutlineNav` e cartão do real). O ajuste de
 * Configurações > Aparência > Resumo ("Mostrar o sumário ao lado do texto") vale na hora.
 */
export function SummaryPreview() {
  const { outline } = useSummaryPreferences();
  const headings = extractHeadings(SAMPLE);

  return (
    <PreviewFrame
      label="Pré-visualização do resumo"
      follow={
        outline && (
          <Card
            data-slot="summary-preview-outline"
            className="sidebar-card hidden h-fit w-44 shrink-0 md:block"
          >
            <CardHeader>
              <CardTitle className="text-sm">Sumário</CardTitle>
            </CardHeader>

            <CardContent>
              <OutlineNav
                ariaLabel="Sumário do exemplo"
                items={headings.map((heading) => ({
                  id: heading.id,
                  label: heading.text,
                  level: heading.level,
                }))}
                activeId={headings[0]?.id}
                onSelect={() => undefined}
              />
            </CardContent>
          </Card>
        )
      }
    >
      <ReadingSection label="Resumo" title="Resumo de exemplo">
        <MarkdownMessage content={SAMPLE} headingIds idPrefix="preview" size="inherit" />
      </ReadingSection>
    </PreviewFrame>
  );
}
