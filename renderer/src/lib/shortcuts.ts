/** Atalhos "G e uma letra" (estilo terminal): endereço da tela → tecla que vem depois do G. */
export const GO_SHORTCUTS: Readonly<Record<string, string>> = {
  "/": "h",
  "/library": "p",
  "/library/books": "l",
  "/library/inbox": "i",
  "/library/new": "n",
  "/jobs/create": "t",
  "/jobs/track": "a",
  "/ai/chat": "c",
  "/ai/usage": "u",
};

/** Quanto tempo o app espera pela segunda tecla depois do G. */
export const GO_SHORTCUT_TIMEOUT_MS = 1200;

/** Texto do atalho de uma tela (ex.: `G H`), ou `undefined` se ela não tem. */
export function goShortcutLabel(url: string): string | undefined {
  const key = GO_SHORTCUTS[url];

  return key ? `G ${key.toUpperCase()}` : undefined;
}

/** Endereço da tela que a tecla (depois do G) abre. */
export function urlForGoKey(key: string): string | undefined {
  const lower = key.toLowerCase();

  return Object.entries(GO_SHORTCUTS).find(([, value]) => value === lower)?.[0];
}

/** O foco está num campo de digitação? Atalhos de uma tecla não podem roubar o que a pessoa escreve. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.getAttribute("role") === "textbox"
  );
}

/** `Ctrl+K` (Windows/Linux) ou `Cmd+K` (macOS). */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k";
}
