/** Ordem personalizada das páginas: lista de ids guardada pelo usuário (some quando ele volta ao automático). */

/** Mostra primeiro os itens que estão na ordem guardada e, no fim, os que ela não conhece (páginas novas). */
export function applyCustomOrder<T extends { id: string }>(
  items: T[],
  order: readonly string[],
): T[] {
  const position = new Map(order.map((id, index) => [id, index]));
  const known = items
    .filter((item) => position.has(item.id))
    .sort((a, b) => position.get(a.id)! - position.get(b.id)!);

  return [...known, ...items.filter((item) => !position.has(item.id))];
}

/**
 * Move `from` para o lugar de `to` entre os `visible` (os que estão na tela) e devolve a ordem completa:
 * a nova ordem dos visíveis seguida do que estava guardado e não aparece agora (filtrado fora).
 */
export function moveInOrder(
  visible: readonly string[],
  stored: readonly string[],
  from: string,
  to: string,
): string[] {
  const fromIndex = visible.indexOf(from);
  const toIndex = visible.indexOf(to);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return [...visible, ...stored.filter((id) => !visible.includes(id))];
  }

  const next = [...visible];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, from);

  return [...next, ...stored.filter((id) => !next.includes(id))];
}

export function parseStoredOrder(raw: string | null): string[] | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;

    return Array.isArray(value) && value.every((id) => typeof id === "string")
      ? value
      : null;
  } catch {
    return null;
  }
}
