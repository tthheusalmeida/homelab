/** Endereço das Configurações, já numa seção quando informada (`?section=`). */
export const SETTINGS_PATH = "/settings";

export function settingsUrl(section?: string | null): string {
  return section ? `${SETTINGS_PATH}?section=${encodeURIComponent(section)}` : SETTINGS_PATH;
}
