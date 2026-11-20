import { Search } from "lucide-react";

import { Input } from "#ui/input";
import { cn } from "#lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Há texto filtrando a lista: o campo ganha a cor de destaque (por padrão, quando tem texto). */
  active?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Pesquisar...",
  className,
  active = value.trim() !== "",
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        data-active={active ? "true" : undefined}
        className={cn(
          "pl-8",
          active && "border-primary/60 bg-primary/10 dark:bg-primary/15",
        )}
      />
    </div>
  );
}
