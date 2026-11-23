import { cn } from '#lib/utils';
import { useReadingPreferences } from '#hooks/use-appearance';

/**
 * Em que lado ficam o acompanhamento (sumário, linha do tempo) e as opções na página. Por padrão
 * o acompanhamento fica à esquerda do texto e as opções à direita; com "Acompanhamento à direita e opções à esquerda"
 * (Configurações > Leitura) trocam. Devolve as classes de ordem (a ordem do HTML não muda) e as
 * colunas do grid, que dependem de existir ou não a coluna de acompanhamento. O acompanhamento (sumário)
 * aparece já a partir de 768 px (a janela do app vai até 900 px e o zoom estreita mais): o centro se
 * reajusta e as opções descem; as três colunas ficam a partir de 1024 px.
 */
export function useReadingSides(hasFollow: boolean) {
  const { reading } = useReadingPreferences();
  const swapped = reading.swapSides;

  return {
    swapped,
    followOrder: swapped ? 'lg:order-3' : 'lg:order-1',
    textOrder: 'lg:order-2',
    // Sem espaço para as três colunas (janela estreita), as opções descem para baixo do texto.
    optionsOrder: cn(swapped ? 'lg:order-1' : 'lg:order-3', hasFollow && 'md:col-span-2 lg:col-span-1'),
    columns: hasFollow
      ? 'md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)_16rem]'
      : swapped
        ? 'lg:grid-cols-[16rem_minmax(0,1fr)]'
        : 'lg:grid-cols-[minmax(0,1fr)_16rem]',
  };
}
