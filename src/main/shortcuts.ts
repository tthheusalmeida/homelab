export interface KeyInput {
  type: string;
  key: string;
  control: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

/** `Ctrl+,` (Windows/Linux) ou `Cmd+,` (macOS): abre as Configurações. */
export function isSettingsShortcut(input: KeyInput): boolean {
  return (
    input.type === 'keyDown' &&
    input.key === ',' &&
    (input.control || input.meta) &&
    !input.alt &&
    !input.shift
  );
}

/**
 * `Ctrl+=` (ou `Cmd+=`): aumentar o zoom da janela. O menu padrão do Electron só aceita `Ctrl+Shift+=`
 * (o "+"), então em teclados onde o "+" fica na mesma tecla do "=" o `Ctrl++` não funcionava
 * enquanto o `Ctrl+-` funcionava.
 */
export function isZoomInShortcut(input: KeyInput): boolean {
  return (
    input.type === 'keyDown' &&
    input.key === '=' &&
    (input.control || input.meta) &&
    !input.alt &&
    !input.shift
  );
}
