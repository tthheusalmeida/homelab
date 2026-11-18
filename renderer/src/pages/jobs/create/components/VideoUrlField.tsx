import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

import { Info } from 'lucide-react';

import { Callout } from '#components/Callout';
import { Button } from '#ui/button';
import { Input } from '#ui/input';
import { Label } from '#ui/label';

import type { LinksField } from '../hooks/useLinksField';
import { VideoUrlStrings } from '../video-url-text';
import { LinkList } from './LinkList';

interface VideoUrlFieldProps {
  field: LinksField;
  disabled?: boolean;
}

/**
 * Links dos vídeos das duas tarefas (transcrever e resumir). Cada link colado (ou digitado e
 * confirmado com Enter ou "Adicionar") entra na lista logo abaixo e vira uma tarefa. Traz o aviso
 * sobre baixar de plataformas, para que quem usa o recurso saiba que é por conta e risco.
 */
export function VideoUrlField({ field, disabled }: VideoUrlFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');

    // Colar um ou vários links já os coloca na lista; texto sem link segue o caminho normal.
    if (text.trim() !== '') {
      event.preventDefault();
      field.add(text);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && field.draft.trim() !== '') {
      event.preventDefault();
      field.add(field.draft);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="video-url">{VideoUrlStrings.label}</Label>

      <div className="flex gap-2">
        <Input
          id="video-url"
          ref={inputRef}
          placeholder={VideoUrlStrings.placeholder}
          value={field.draft}
          onChange={(event) => field.setDraft(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onBlur={field.touch}
          disabled={disabled}
          aria-invalid={field.error ? true : undefined}
          spellCheck={false}
          autoComplete="off"
        />

        <Button
          type="button"
          variant="outline"
          disabled={disabled || field.draft.trim() === ''}
          onClick={() => field.add(field.draft)}
        >
          {VideoUrlStrings.add}
        </Button>
      </div>

      {field.error && (
        <Callout tone="warning" role="alert">
          {field.error}
        </Callout>
      )}

      {field.partialMessage && (
        <Callout tone="warning" role="status">
          {field.partialMessage}
        </Callout>
      )}

      <LinkList
        links={field.links}
        disabled={disabled}
        onEdit={(link) => {
          field.edit(link);
          inputRef.current?.focus();
        }}
        onRemove={field.remove}
        onClear={field.clear}
      />

      <p className="text-sm text-muted-foreground">{VideoUrlStrings.hint}</p>

      <p
        role="note"
        className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground/80"
      >
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {VideoUrlStrings.notice}
      </p>
    </div>
  );
}
