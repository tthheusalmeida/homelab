import { useId, useState } from 'react';

import { textField, type TextKind } from '#lib/infographic-text-edit';
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

interface TextEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Qual texto é (o nome do campo, o limite e se pode ficar em branco vêm daí). */
  kind: TextKind;
  /** O texto de agora. A janela guarda a cópia dele ao abrir; use `key` para recomeçar em outro texto. */
  value: string;
  onSave: (value: string) => void;
}

/**
 * Janela de **editar um texto** do infográfico: um campo (de uma linha ou de várias, conforme o
 * texto) com o limite que o servidor usa para cortar, o contador e o aviso de texto obrigatório. Só
 * muda o rascunho; a edição vale de vez ao salvar o infográfico. Enter confirma.
 */
export function TextEditDialog({ open, onOpenChange, kind, value, onSave }: TextEditDialogProps) {
  const field = textField(kind);
  const inputId = useId();
  const [draft, setDraft] = useState(value);
  const text = draft.replace(/\s+/g, ' ').trim();
  const blank = text === '';
  const invalid = field.required && blank;
  const unchanged = text === value.trim();

  const save = () => {
    if (!invalid && !unchanged) {
      onSave(text);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent bare>
        <DialogHeader>
          <DialogTitle>Editar o texto</DialogTitle>

          <DialogDescription>
            {field.required
              ? `${field.label}. Não pode ficar vazio.`
              : `${field.label}. Deixe em branco para tirar.`}
          </DialogDescription>
        </DialogHeader>

        <DialogForm
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Label htmlFor={inputId} className="sr-only">
            {field.label}
          </Label>

          {field.multiline ? (
            <Textarea
              id={inputId}
              autoFocus
              rows={3}
              maxLength={field.max}
              value={draft}
              aria-invalid={invalid}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // o texto é uma frase só: Enter confirma em vez de quebrar a linha
                if (event.key === 'Enter') {
                  event.preventDefault();
                  save();
                }
              }}
            />
          ) : (
            <Input
              id={inputId}
              autoFocus
              maxLength={field.max}
              value={draft}
              aria-invalid={invalid}
              onChange={(event) => setDraft(event.target.value)}
            />
          )}

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span
              role={invalid ? 'alert' : undefined}
              className={invalid ? 'text-destructive' : ''}
            >
              {invalid ? 'Este texto não pode ficar vazio.' : ''}
            </span>

            <span className="font-mono" aria-label="Caracteres usados">
              {draft.length}/{field.max}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <Button type="submit" disabled={invalid || unchanged}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
