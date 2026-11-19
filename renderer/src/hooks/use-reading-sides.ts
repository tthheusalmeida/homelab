import { useReadingPreferences } from '#hooks/use-appearance';

/**
 * Em que lado ficam o acompanhamento (sumário, linha do tempo) e as opções na página. Por padrão
 * o acompanhamento fica à esquerda do texto e as opções à direita; com "Acompanhamento à direita e opções à esquerda"
 * (Configurações > Leitura) trocam. Devolve as classes de ordem (a ordem do HTML não muda) e as
 * colunas do grid, que dependem de existir ou não a coluna de acompanhamento.
 */
export function useReadingSides(hasFollow: boolean) {
  const { reading } = useReadingPreferences();
  const swapped = reading.swapSides;

  return {
    swapped,
    followOrder: swapped ? 'lg:order-3' : 'lg:order-1',
    textOrder: 'lg:order-2',
    optionsOrder: swapped ? 'lg:order-1' : 'lg:order-3',
    columns: hasFollow
      ? 'lg:grid-cols-[16rem_minmax(0,1fr)_16rem]'
      : swapped
        ? 'lg:grid-cols-[16rem_minmax(0,1fr)]'
        : 'lg:grid-cols-[minmax(0,1fr)_16rem]',
  };
}
