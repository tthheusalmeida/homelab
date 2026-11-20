import { normalizeKey } from '#lib/text';

/**
 * A categoria escolhida no filtro depois que uma categoria foi renomeada ou movida: se ela era a
 * categoria editada (ou ficava dentro dela), o filtro passa para o caminho novo, mantendo os níveis
 * de baixo; qualquer outra escolha fica como estava.
 */
export function followRenamedCategory(selected: string[], from: string[], to: string[]): string[] {
  const inside =
    selected.length >= from.length &&
    from.every((name, level) => normalizeKey(name) === normalizeKey(selected[level]));

  return inside ? [...to, ...selected.slice(from.length)] : selected;
}
