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
