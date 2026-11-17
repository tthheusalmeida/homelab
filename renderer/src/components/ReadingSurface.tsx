import type { ComponentProps } from 'react';

import { useReadingPreferences } from '#hooks/use-appearance';
import { readingStyle } from '#lib/reading';
import { cn } from '#lib/utils';

/**
 * Área de leitura com as preferências do usuário (Configurações > Aparência > Leitura): fonte,
 * tamanho da letra, cores de fundo e de texto (cada uma com sua intensidade) e o zoom, que
 * amplia a letra e a coluna (`.reading-column`) juntas.
 * É a única fonte desse visual: páginas, livros, modo leitura e o preview das Configurações usam
 * este componente. O que está dentro herda fonte, tamanho e cor.
 */
export function ReadingSurface({
  className,
  style,
  framed = true,
  ...props
}: ComponentProps<'div'> & {
  /**
   * Com cor de fundo escolhida, o texto vira um painel com cantos arredondados e respiro. Passe
   * `false` quando quem usa já cuida disso (modo leitura em tela cheia, preview).
   */
  framed?: boolean;
}) {
  const { reading } = useReadingPreferences();

  return (
    <div
      data-slot="reading-surface"
      data-custom-bg={reading.background === 'default' ? undefined : ''}
      data-framed={framed ? '' : undefined}
      className={cn('reading-surface', className)}
      style={{ ...readingStyle(reading), ...style }}
      {...props}
    />
  );
}
