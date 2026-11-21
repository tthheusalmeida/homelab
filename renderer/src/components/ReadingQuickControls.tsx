import { Card, CardContent, CardHeader, CardTitle } from '#ui/card';

import { ReadingSteppers } from './ReadingSteppers';
import { useReadingPreferences } from '#hooks/use-appearance';
import type { ReadingPreferences } from '#shared/contracts/reading';

/**
 * Atalhos de leitura (tamanho da letra e zoom) para o painel ao lado do sumário, na página, no livro
 * e no modo leitura. São os mesmos valores de Configurações > Aparência > Leitura: mudar aqui muda lá.
 * O zoom alarga ou estreita a coluna do texto sem mexer no tamanho da letra.
 */
export function ReadingQuickControls() {
  const { reading, updateReading } = useReadingPreferences();

  const change = (patch: Partial<ReadingPreferences>) => {
    // Se a gravação falhar, o provedor volta ao valor anterior; não há o que avisar aqui.
    updateReading?.(patch).catch(() => undefined);
  };

  return (
    <Card aria-label="Ajustes de leitura" className="sidebar-card gap-2 py-3">
      <CardHeader>
        <CardTitle className="text-sm">Leitura</CardTitle>
      </CardHeader>

      <CardContent className="gap-2">
        <ReadingSteppers reading={reading} change={change} fontLabel="Letra" zoomLabel="Zoom" />
      </CardContent>
    </Card>
  );
}
