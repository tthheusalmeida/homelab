import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

import { Button } from '#ui/button';
import { Card, CardContent } from '#ui/card';
import { useAppearance } from '#hooks/use-appearance';
import { accentLabels, themeLabels } from '#lib/appearance';
import { cn } from '#lib/utils';
import {
  ACCENT_IDS,
  DEFAULT_APPEARANCE,
  THEME_MODES,
  type Appearance,
} from '#shared/contracts/appearance';

import { Strings } from '../strings';

/**
 * Tema e cor de destaque. Diferente das outras seções, vale na hora e não pede reinício:
 * cada escolha já troca o app inteiro (as duas janelas) e é gravada em seguida.
 */
export function AppearanceSection() {
  const { appearance, update, reset } = useAppearance();
  const [error, setError] = useState<string | null>(null);

  const change = (patch: Partial<Appearance>) => {
    setError(null);
    update(patch).catch((failure: Error) => setError(failure.message));
  };

  const isDefault =
    appearance.theme === DEFAULT_APPEARANCE.theme &&
    appearance.accent === DEFAULT_APPEARANCE.accent;

  return (
    <Card className="animate-enter">
      <CardContent className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium" id="theme-label">
              {Strings.appearance.theme}
            </p>
            <p className="text-xs text-muted-foreground">{Strings.appearance.themeHint}</p>
          </div>

          <div role="radiogroup" aria-labelledby="theme-label" className="inline-flex w-fit gap-1">
            {THEME_MODES.map((mode) => (
              <Button
                key={mode}
                type="button"
                role="radio"
                aria-checked={appearance.theme === mode}
                variant={appearance.theme === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => change({ theme: mode })}
              >
                {themeLabels[mode]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium" id="accent-label">
              {Strings.appearance.accent}
            </p>
            <p className="text-xs text-muted-foreground">{Strings.appearance.accentHint}</p>
          </div>

          <div role="radiogroup" aria-labelledby="accent-label" className="flex flex-wrap gap-2.5">
            {ACCENT_IDS.map((accent) => {
              const selected = appearance.accent === accent;

              return (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={accentLabels[accent]}
                  title={accentLabels[accent]}
                  // `data-accent` + `dark` fazem `bg-primary` mostrar a cor de destaque desta bolinha.
                  data-accent={accent}
                  className={cn(
                    'dark flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground ring-offset-2 ring-offset-card transition-shadow duration-200 hover:ring-2 hover:ring-foreground/30',
                    selected && 'ring-2 ring-foreground',
                  )}
                  onClick={() => change({ accent })}
                >
                  {selected && <Check className="size-4" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="animate-enter-fade text-sm text-destructive">
            {error}
          </p>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDefault}
            onClick={() => {
              setError(null);
              reset().catch((failure: Error) => setError(failure.message));
            }}
          >
            <RotateCcw /> {Strings.appearance.restore}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
