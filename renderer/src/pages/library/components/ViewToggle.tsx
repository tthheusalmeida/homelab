import { LayoutGrid, List, Rows3 } from "lucide-react";

import { OptionToggle } from "#components/OptionToggle";

export const viewModes = ["list", "card", "grid"] as const;
export type ViewMode = (typeof viewModes)[number];

const options = [
  { id: "list", label: "Lista", icon: List },
  { id: "card", label: "Cartões", icon: Rows3 },
  { id: "grid", label: "Grade", icon: LayoutGrid },
] as const;

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

/** Alterna entre lista (mais densa), cartões e grade. */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <OptionToggle
      label="Modo de visualização"
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
