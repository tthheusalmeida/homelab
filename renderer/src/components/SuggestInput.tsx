import { Autocomplete } from "@base-ui/react/autocomplete";

import { Input } from "#ui/input";
import { popupItem, popupSurface } from "#ui/popup";
import { cn } from "#lib/utils";

interface SuggestInputProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Sugestões: aparecem numa lista do tema ao focar ou digitar (filtradas pelo que foi digitado). O texto continua livre. */
  suggestions: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Campo de texto livre com **lista de sugestões** no desenho do app (o mesmo popup do `OptionSelect`),
 * no lugar da lista nativa do navegador, que não segue o tema. Sem sugestões, é só um `Input`.
 */
export function SuggestInput({
  id,
  value,
  onValueChange,
  suggestions,
  placeholder,
  disabled,
  className,
}: SuggestInputProps) {
  return (
    <Autocomplete.Root
      items={suggestions}
      value={value}
      onValueChange={onValueChange}
      openOnInputClick
      disabled={disabled}
    >
      <Autocomplete.Input
        render={<Input id={id} placeholder={placeholder} className={className} />}
      />

      {suggestions.length > 0 && (
        <Autocomplete.Portal>
          <Autocomplete.Positioner sideOffset={4} align="start" className="isolate z-50">
            <Autocomplete.Popup
              data-slot="suggest-content"
              className={cn(
                popupSurface,
                "max-h-64 w-(--anchor-width) min-w-36 p-1",
              )}
            >
              <Autocomplete.List>
                {(suggestion: string) => (
                  <Autocomplete.Item
                    key={suggestion}
                    value={suggestion}
                    className={cn(popupItem, "pr-2")}
                  >
                    {suggestion}
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      )}
    </Autocomplete.Root>
  );
}
