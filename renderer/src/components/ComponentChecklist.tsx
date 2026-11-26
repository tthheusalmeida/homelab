import type { ReactNode } from 'react';
import { Check, CircleAlert } from 'lucide-react';

import { HexDot, HexLoader } from '#components/Hex';
import { ProgressBar } from '#components/ProgressBar';
import { SettingsGroup } from '#components/SettingsGroup';
import { Badge } from '#ui/badge';
import { formatBytes } from '#lib/format';
import { ComponentStrings, progressText } from '#lib/components-text';
import { cn } from '#lib/utils';
import type { ComponentGroup, ComponentInfo } from '#shared/contracts/components';

const GROUP_ORDER: ComponentGroup[] = ['runtime', 'download', 'gpu', 'model', 'ocr'];
const WORKING = new Set(['queued', 'downloading', 'verifying', 'installing']);

interface ComponentChecklistProps {
  components: ComponentInfo[];
  /** Ids marcados para instalar (os obrigatórios aparecem marcados e travados). */
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Trava as caixas enquanto uma instalação roda. */
  locked?: boolean;
  /** Ações extras por item (ex.: Usar, Remover nas Configurações). */
  actions?: (component: ComponentInfo) => ReactNode;
}

function StateIcon({ component }: { component: ComponentInfo }) {
  if (component.state === 'installed') {
    return <Check aria-hidden className="size-4 text-emerald-500" />;
  }

  if (component.state === 'failed') {
    return <CircleAlert aria-hidden className="size-4 text-destructive" />;
  }

  if (WORKING.has(component.state)) {
    return <HexLoader decorative className="size-4" />;
  }

  return <HexDot className="bg-muted-foreground/40" />;
}

/**
 * Lista de componentes agrupada (obrigatórios, aceleração, modelos), com estado, tamanho,
 * progresso e escolha. Fonte única da lista: o assistente de instalação e Configurações >
 * Componentes usam este componente. Item novo no catálogo do main aparece aqui sozinho.
 */
export function ComponentChecklist({
  components,
  selected,
  onToggle,
  locked = false,
  actions,
}: ComponentChecklistProps) {
  return (
    <div className="flex flex-col gap-5">
      {GROUP_ORDER.map((group) => {
        const items = components.filter((component) => component.group === group);

        if (items.length === 0) {
          return null;
        }

        return (
          <SettingsGroup
            key={group}
            title={ComponentStrings.groups[group]}
            hint={ComponentStrings.groupHints[group]}
          >
            <ul className="flex flex-col gap-1.5">
              {items.map((component) => (
                <ComponentRow
                  key={component.id}
                  component={component}
                  checked={
                    component.required ||
                    component.state === 'installed' ||
                    selected.has(component.id)
                  }
                  disabled={locked || component.required || component.state === 'installed'}
                  onToggle={() => onToggle(component.id)}
                  actions={actions?.(component)}
                />
              ))}
            </ul>
          </SettingsGroup>
        );
      })}
    </div>
  );
}

function ComponentRow({
  component,
  checked,
  disabled,
  onToggle,
  actions,
}: {
  component: ComponentInfo;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  actions?: ReactNode;
}) {
  const working = WORKING.has(component.state);
  const showProgress = component.state === 'downloading' && component.progress;

  return (
    <li
      data-state={component.state}
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors',
        working && 'border-primary/40 bg-primary/5',
        component.state === 'failed' && 'border-destructive/40',
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={component.label}
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="mt-1 size-4 shrink-0 accent-primary disabled:opacity-60"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{component.label}</span>

            {component.required && <Badge variant="secondary">{ComponentStrings.required}</Badge>}
            {component.recommended && !component.required && (
              <Badge>{ComponentStrings.recommended}</Badge>
            )}
            {component.active && <Badge variant="outline">{ComponentStrings.active}</Badge>}
          </div>

          <p className="text-xs text-muted-foreground">{component.description}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <StateIcon component={component} />
            {ComponentStrings.states[component.state]}
          </span>

          <span className="font-mono">
            {component.bundled ? ComponentStrings.bundledNote : formatBytes(component.sizeBytes)}
          </span>
        </div>
      </div>

      {showProgress && (
        <div className="flex flex-col gap-1">
          <ProgressBar
            value={component.progress?.receivedBytes ?? 0}
            total={component.progress?.totalBytes ?? 0}
            label={`Baixando ${component.label}`}
          />
          <p className="font-mono text-[11px] text-muted-foreground">{progressText(component)}</p>
        </div>
      )}

      {component.error && (
        <p role="alert" className="text-xs text-destructive">
          {component.error}
        </p>
      )}

      {actions && <div className="flex justify-end gap-2">{actions}</div>}
    </li>
  );
}
