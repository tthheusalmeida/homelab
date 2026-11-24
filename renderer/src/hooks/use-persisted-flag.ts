import { useCallback, useState } from 'react';

function read(key: string, initial: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);

    return stored === null ? initial : stored === '1';
  } catch {
    return initial;
  }
}

/**
 * Um sim/não de tela lembrado entre aberturas do app (localStorage), como "painel aberto". É só uma
 * conveniência: se o armazenamento falhar, vale o valor inicial e nada quebra.
 */
export function usePersistedFlag(
  storageKey: string,
  initial: boolean,
): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(() => read(storageKey, initial));

  const update = useCallback(
    (next: boolean) => {
      setValue(next);

      try {
        window.localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        // sem armazenamento: o valor vale só nesta tela
      }
    },
    [storageKey],
  );

  return [value, update];
}
