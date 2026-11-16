import { Info } from 'lucide-react';

import { Input } from '#ui/input';
import { Label } from '#ui/label';

import { VideoUrlStrings } from '../video-url-text';

interface VideoUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Campo do link do vídeo das duas tarefas (transcrever e resumir). Traz o aviso sobre baixar de
 * plataformas, para que quem usa o recurso saiba que é por conta e risco.
 */
export function VideoUrlField({ value, onChange, disabled }: VideoUrlFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="video-url">{VideoUrlStrings.label}</Label>

      <Input
        id="video-url"
        type="url"
        placeholder="https://..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
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
