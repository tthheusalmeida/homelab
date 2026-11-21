import { INFOGRAPHIC_LAYOUTS, type InfographicLayoutId } from '#shared/infographic-layouts';

/** Escolha na tela: a história completa (a IA monta várias seções) ou um único modelo. */
export type LayoutChoice = InfographicLayoutId | 'auto';

export const AUTO_LAYOUT = 'auto' as const;

/** Opções do seletor (a primeira é a história completa, com a IA escolhendo o modelo de cada seção). */
export const LAYOUT_OPTIONS: Array<{ id: LayoutChoice; label: string }> = [
  { id: AUTO_LAYOUT, label: 'História completa' },
  ...INFOGRAPHIC_LAYOUTS.map(({ id, label }) => ({ id, label: `Só: ${label}` })),
];

/** Nome sugerido para o arquivo de imagem (o diálogo do sistema deixa o usuário trocar). */
export function infographicImageName(title: string, transparent = false): string {
  const clean = title.replace(/\s+/g, ' ').trim().slice(0, 80);
  const name = clean ? `Infográfico - ${clean}` : 'Infográfico';

  return transparent ? `${name} (sem fundo)` : name;
}
