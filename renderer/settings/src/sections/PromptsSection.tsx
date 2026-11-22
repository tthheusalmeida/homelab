import { useState } from 'react';

import { FileText, Inbox, LayoutPanelTop, Network, Plus, type LucideIcon } from 'lucide-react';

import { ActionMenu } from '#components/ActionMenu';
import { Callout } from '#components/Callout';
import { ConfirmDialog } from '#components/ConfirmDialog';
import { LoadingState } from '#components/LoadingState';
import { OptionSelect } from '#components/OptionSelect';
import { OptionToggle, type ToggleOption } from '#components/OptionToggle';
import { SettingsGroup, SettingsPanel, SettingsStack } from '#components/SettingsGroup';
import { useSnackbar } from '#components/Snackbar';
import { useErrorAlert } from '#hooks/use-error-alert';
import {
  PROMPT_KINDS,
  type PromptKind,
  type PromptKindInfo,
  type PromptVersion,
} from '#shared/contracts/prompts';
import { Badge } from '#ui/badge';
import { Button } from '#ui/button';

import {
  PromptEditorDialog,
  type PromptEditorSave,
  type PromptEditorTarget,
} from '../components/PromptEditorDialog';
import { useActivatePrompt, useDeletePrompt, usePrompts, useSavePrompt } from '../hooks';
import { Strings } from '../strings';

const text = Strings.prompts;

/** Valor do seletor para o padrão do app (as versões do usuário usam o próprio id). */
const DEFAULT_OPTION = 'default';

/** Ícone de cada prompt no seletor de qual prompt editar. */
const KIND_ICONS: Record<PromptKind, LucideIcon> = {
  summary: FileText,
  mindMap: Network,
  infographic: LayoutPanelTop,
  classification: Inbox,
};

function VersionRow({
  version,
  active,
  disabled,
  onUse,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  version: PromptVersion;
  active: boolean;
  disabled: boolean;
  onUse: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{version.name}</span>

        {active && <Badge variant="secondary">{text.badge}</Badge>}
      </div>

      {/* Ações por prioridade: usar em destaque, editar em contorno e o resto no menu. */}
      <div className="flex items-center gap-2">
        {!active && (
          <Button type="button" size="sm" disabled={disabled} onClick={onUse}>
            {text.use}
          </Button>
        )}

        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onEdit}>
          {text.edit}
        </Button>

        <ActionMenu
          label={`${text.more}: ${version.name}`}
          iconOnly
          disabled={disabled}
          groups={[
            [{ id: 'duplicate', label: text.duplicate, onSelect: onDuplicate }],
            [{ id: 'remove', label: text.remove, destructive: true, onSelect: onRemove }],
          ]}
        />
      </div>
    </li>
  );
}

function KindPanel({ info, limits }: { info: PromptKindInfo; limits: PromptLimits }) {
  const save = useSavePrompt();
  const remove = useDeletePrompt();
  const activate = useActivatePrompt();
  const snackbar = useSnackbar();

  const [editor, setEditor] = useState<{ key: number; target: PromptEditorTarget } | null>(null);
  const [removing, setRemoving] = useState<PromptVersion | null>(null);

  const busy = save.isPending || remove.isPending || activate.isPending;
  const kind = info.kind;

  // Todo erro de gravação aparece como alerta no rodapé (o texto vem do back, em português).
  useErrorAlert(save.isError && (save.error.message || text.saveFailed));
  useErrorAlert(activate.isError && (activate.error.message || text.saveFailed));
  useErrorAlert(remove.isError && (remove.error.message || text.saveFailed));

  const open = (target: PromptEditorTarget) => {
    save.reset();
    setEditor((current) => ({ key: (current?.key ?? 0) + 1, target }));
  };

  const use = (id: string | null) =>
    activate.mutate(
      { kind, id },
      {
        onSuccess: () => {
          const name = info.versions.find((version) => version.id === id)?.name;

          snackbar.success(text.activated(name ?? text.defaultName));
        },
      },
    );

  const submit = ({ id, name, text: body, activate: useIt }: PromptEditorSave) =>
    save.mutate(
      { kind, id, name, text: body, activate: useIt },
      {
        onSuccess: () => {
          setEditor(null);
          snackbar.success(text.saved);
        },
      },
    );

  const options = [
    { id: DEFAULT_OPTION, label: text.defaultName },
    ...info.versions.map((version) => ({ id: version.id, label: version.name })),
  ];

  return (
    <SettingsStack>
      <SettingsGroup title={text.inUse} hint={text.inUseHint}>
        <SettingsPanel className="gap-3 p-3">
          <p className="text-sm text-muted-foreground">{info.description}</p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <OptionSelect
              label={text.inUse}
              value={info.activeId ?? DEFAULT_OPTION}
              options={options}
              placeholder={text.placeholder}
              triggerWidth="w-64"
              contentWidth="w-64"
              disabled={busy}
              onValueChange={(value) => value && use(value === DEFAULT_OPTION ? null : value)}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => open({ mode: 'view', text: info.defaultText })}
            >
              {text.defaultName}: {text.view}
            </Button>
          </div>
        </SettingsPanel>
      </SettingsGroup>

      <SettingsGroup title={text.versions} hint={text.versionsHint}>
        <SettingsPanel className="gap-3 p-3">
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => open({ mode: 'create', text: info.defaultText })}
            >
              <Plus /> {text.newVersion}
            </Button>
          </div>

          {info.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{text.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label={text.versions}>
              {info.versions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  active={version.id === info.activeId}
                  disabled={busy}
                  onUse={() => use(version.id)}
                  onEdit={() => open({ mode: 'edit', version })}
                  onDuplicate={() =>
                    open({
                      mode: 'create',
                      name: `${version.name}${text.copySuffix}`.slice(0, limits.maxNameChars),
                      text: version.text,
                    })
                  }
                  onRemove={() => {
                    remove.reset();
                    setRemoving(version);
                  }}
                />
              ))}
            </ul>
          )}
        </SettingsPanel>
      </SettingsGroup>

      {editor && (
        <PromptEditorDialog
          key={editor.key}
          open
          onOpenChange={(next) => !next && setEditor(null)}
          target={editor.target}
          limits={limits}
          isPending={save.isPending}
          onSave={submit}
          onCreateFromDefault={(body) => open({ mode: 'create', text: body })}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={text.deleteTitle(removing?.name ?? '')}
        description={text.deleteText}
        confirmLabel={text.deleteConfirm}
        destructive
        isPending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(
            { kind, id: removing.id },
            {
              onSuccess: () => {
                setRemoving(null);
                snackbar.success(text.deleted);
              },
            },
          )
        }
      />
    </SettingsStack>
  );
}

type PromptLimits = NonNullable<ReturnType<typeof usePrompts>['data']>['limits'];

/**
 * Configurações > Prompts: o padrão do app, as **versões nomeadas** do usuário e qual está em uso,
 * para cada prompt de IA (hoje o do mapa mental). O usuário escreve só as instruções; o contrato
 * (limites, formato da resposta, segurança) é do back e não aparece aqui. Ver `docs/prompts.md`.
 */
export function PromptsSection() {
  const prompts = usePrompts();
  const [kind, setKind] = useState<PromptKind>(PROMPT_KINDS[0]);

  useErrorAlert(prompts.isError && text.loadFailed, {
    label: text.retry,
    onClick: () => void prompts.refetch(),
  });

  if (prompts.isPending) {
    return <LoadingState message="Carregando os prompts" />;
  }

  if (!prompts.data) {
    return null;
  }

  const { kinds, limits } = prompts.data;
  const info = kinds.find((candidate) => candidate.kind === kind) ?? kinds[0];
  const options: ToggleOption<PromptKind>[] = kinds.map((candidate) => ({
    id: candidate.kind,
    label: candidate.label,
    icon: KIND_ICONS[candidate.kind],
  }));

  return (
    <SettingsStack>
      <Callout role="note">{text.note}</Callout>

      {kinds.length > 1 && (
        <OptionToggle
          value={info.kind}
          options={options}
          onChange={setKind}
          label={text.tabs}
          showLabels
        />
      )}

      <div key={info.kind} className="animate-enter-fade">
        <KindPanel info={info} limits={limits} />
      </div>
    </SettingsStack>
  );
}
