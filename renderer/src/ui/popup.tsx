/**
 * Classes compartilhadas das listas suspensas (select, menu, sugestões) e do tooltip: um só desenho
 * para a superfície, os itens e a animação de abrir e fechar, nos dois temas. Mudou o visual das
 * listas do app? Mude aqui.
 */

/**
 * Abrir e fechar do popup (o mesmo de todas as listas suspensas): **só opacidade**. Zoom e deslize
 * mexem na geometria enquanto o Positioner calcula o lugar e a lista parece tremer.
 */
export const popupMotion =
  "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0";

/** Superfície do popup: fundo do tema, sombra e um anel com um toque da cor de destaque. */
export const popupSurface =
  "origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none duration-100";

/** Um item da lista: realce na cor de destaque e ícones no tamanho padrão. Sem animação própria: o texto aparece firme junto com o popup. */
export const popupItem =
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-primary/12 data-highlighted:text-foreground data-selected:font-medium data-selected:text-brand-text [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/** Rótulo de um grupo de itens. */
export const popupLabel =
  "px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";
