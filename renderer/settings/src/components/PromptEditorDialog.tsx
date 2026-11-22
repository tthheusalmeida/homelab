import { useId, useState } from 'react';

import { ConfirmDialog } from '#components/ConfirmDialog';
import { Button } from '#ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';
import { Input } from '#ui/input';
import { Label } from '#ui/label';
import { Textarea } from '#ui/textarea';
import type { PromptVersion, PromptsOverview } from '#shared/contracts/prompts';

import { Strings } from '../strings';

import { CheckboxField } from './CheckboxField';

const text = Strings.prompts;

/** O que a janela mostra: uma versão nova (já com um texto de partida), uma existente ou o padrão (só leitura). */
export type PromptEditorTarget =
  | { mode: 'create'; name?: string; text: string }
  | { mode: 'edit'; version: PromptVersion }
  | { mode: 'view'; text: string };

export interface PromptEditorSave {
  id?: string;
  name: string;
  text: string;
  activate: boolean;
}

interface PromptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quem abre troca a `key` ao abrir outro alvo: a janela guarda a cópia do que recebe. */
  target: PromptEditorTarget;
  limits: PromptsOverview['limits'];
  isPending: boolean;
  onSave: (input: PromptEditorSave) => void;
  /** Só no modo `view`: leva o texto do padrão para uma versão nova. */
  onCreateFromDefault: (text: string) => void;
}

/**
 * Janela de **escrever as instruções** de uma versão (ou só ler o padrão). Mostra o contador com os
 * limites de tamanho do texto; quem barra de verdade é o back, e o motivo volta como alerta. Fechar
 * com mudança não salva pergunta antes, porque o texto pode ser longo.
 */
export function PromptEditorDialog({
  open,
  onOpenChange,
  target,
  limits,
  isPending,
  onSave,
  onCreateFromDefault,
}: PromptEditorDialogProps) {
  const nameId = useId();
  const textId = useId();
  const readOnly = target.mode === 'view';
  const initialName =
    target.mode === 'edit'
      ? target.version.name
      : target.mode === 'create'
        ? (target.name ?? '')
        : '';
  const initialText = target.mode === 'edit' ? target.version.text : target.text;

  const [name, setName] = useState(initialName);
  const [body, setBody] = useState(initialText);
  const [activate, setActivate] = useState(target.mode === 'create');
  const [confirmingClose, setConfirmingClose] = useState(false);

  const trimmed = body.trim();
  const tooShort = !readOnly && trimmed.length < limits.minChars;
  const tooLong = trimmed.length > limits.maxChars;
  const dirty = !readOnly && (name !== initialName || body !== initialText);
  // Editar sem mudar nada não precisa gravar; uma versão nova precisa de nome e texto.
  const canSave =
    !readOnly &&
    name.trim() !== '' &&
    !tooShort &&
    !tooLong &&
    (target.mode === 'create' || dirty) &&
    !isPending;

  const requestClose = () => (dirty ? setConfirmingClose(true) : onOpenChange(false));

  const title =
    target.mode === 'create'
      ? text.createTitle
      : target.mode === 'edit'
        ? text.editTitle
        : text.viewTitle;
  const hint = target.mode === 'view' ? text.viewHint : text.createHint;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent bare className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>

            <DialogDescription>{hint}</DialogDescription>
          </DialogHeader>

          <DialogForm
            onSubmit={(event) => {
              event.preventDefault();

              if (canSave) {
                onSave({
                  id: target.mode === 'edit' ? target.version.id : undefined,
                  name: name.trim(),
                  text: trimmed,
                  activate: target.mode === 'create' ? activate : false,
                });
              }
            }}
          >
            {!readOnly && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>{text.name}</Label>

                <Input
                  id={nameId}
                  value={name}
                  maxLength={limits.maxNameChars}
                  placeholder={text.namePlaceholder}
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={textId}>{text.text}</Label>

              <Textarea
                id={textId}
                rows={14}
                readOnly={readOnly}
                value={body}
                aria-invalid={tooShort || tooLong}
                className="min-h-64 font-mono text-xs leading-relaxed"
                onChange={(event) => setBody(event.target.value)}
              />

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className={tooShort || tooLong ? 'text-destructive' : ''}>
                  {tooLong
                    ? text.tooLong(limits.maxChars)
                    : tooShort
                      ? text.tooShort(limits.minChars)
                      : ''}
                </span>

                <span className="font-mono" aria-label={text.counter}>
                  {body.length}/{limits.maxChars}
                </span>
              </div>
            </div>

            {target.mode === 'create' && (
              <CheckboxField
                id={`${nameId}-activate`}
                label={text.activateOnSave}
                checked={activate}
                onChange={setActivate}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose}>
                {readOnly ? text.close : text.cancel}
              </Button>

              {readOnly ? (
                <Button type="button" onClick={() => onCreateFromDefault(target.text)}>
                  {text.createFromDefault}
                </Button>
              ) : (
                <Button type="submit" disabled={!canSave} loading={isPending}>
                  {text.save}
                </Button>
              )}
            </DialogFooter>
          </DialogForm>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title={text.discardTitle}
        description={text.discardText}
        confirmLabel={text.discard}
        destructive
        onConfirm={() => {
          setConfirmingClose(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
