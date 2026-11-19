import { Card, CardContent, CardHeader, CardTitle } from '#ui/card';
import { scrollToId } from '#lib/scroll';
import type { Heading } from '#lib/markdown';

import { OutlineNav } from '#components/OutlineNav';

interface DocumentOutlineProps {
  /** Títulos do texto. */
  headings: Heading[];
  /** Título sendo lido agora (destacado). */
  activeId?: string;
}

/** Menos títulos que isto e o sumário não aparece (não ajudaria a navegar). */
export const OUTLINE_MIN_HEADINGS = 2;

/** Cartão "Sumário": os títulos do texto, com o que está em leitura em destaque. */
export function DocumentOutline({ headings, activeId }: DocumentOutlineProps) {
  if (headings.length < OUTLINE_MIN_HEADINGS) {
    return null;
  }

  return (
    <Card className="sidebar-card">
      <CardHeader>
        <CardTitle className="text-sm">Sumário</CardTitle>
      </CardHeader>

      <CardContent>
        <OutlineNav
          ariaLabel="Sumário"
          className="max-h-[60dvh]"
          items={headings.map((heading) => ({
            id: heading.id,
            label: heading.text,
            level: heading.level,
          }))}
          activeId={activeId}
          onSelect={scrollToId}
        />
      </CardContent>
    </Card>
  );
}
