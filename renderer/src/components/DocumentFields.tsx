import { Input } from "#ui/input";
import { Label } from "#ui/label";

import { Callout } from "#components/Callout";
import {
  CategoryPicker,
  type CategoryOption,
} from "#components/CategoryPicker";
import { TagInput } from "#components/TagInput";

interface DocumentFieldsProps {
  /** Prefixo dos ids, para vários formulários não colidirem. */
  idPrefix: string;

  title: string;
  onTitleChange: (title: string) => void;
  titlePlaceholder?: string;
  /** Trava só o título (os outros campos continuam editáveis) e explica por quê. */
  titleDisabledReason?: string;

  category: string[];
  onCategoryChange: (category: string[]) => void;
  categoryOptions: CategoryOption[];

  tags: string[];
  onTagsChange: (tags: string[]) => void;

  disabled?: boolean;
}

/** Título, categoria (pasta) e tags de um documento da biblioteca. */
export function DocumentFields({
  idPrefix,
  title,
  onTitleChange,
  titlePlaceholder,
  titleDisabledReason,
  category,
  onCategoryChange,
  categoryOptions,
  tags,
  onTagsChange,
  disabled,
}: DocumentFieldsProps) {
  const titleId = `${idPrefix}-title`;

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={titleId}>Título</Label>

        <Input
          id={titleId}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={titlePlaceholder}
          disabled={disabled || Boolean(titleDisabledReason)}
        />

        {titleDisabledReason && <Callout tone="warning">{titleDisabledReason}</Callout>}
      </div>

      <CategoryPicker
        value={category}
        onChange={onCategoryChange}
        options={categoryOptions}
        disabled={disabled}
      />

      <div className="space-y-2">
        <Label>Tags</Label>

        <p className="text-sm text-muted-foreground">
          Etiquetas livres para achar a página na busca, independentes da
          pasta. Ex.: docker, prova, revisar.
        </p>

        <TagInput value={tags} onChange={onTagsChange} disabled={disabled} />
      </div>
    </>
  );
}
