import { ChevronDown } from "lucide-react";

import { DocumentFields } from "#components/DocumentFields";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#ui/collapsible";

import { useCategories } from "../../../library/hooks/useLibrary";
import { VideoUrlStrings } from "../video-url-text";

interface JobDocumentFieldsProps {
  idPrefix: string;
  title: string;
  onTitleChange: (title: string) => void;
  category: string[];
  onCategoryChange: (category: string[]) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  /** Vários links: o título único não vale (cada documento usa o padrão). */
  isBatch?: boolean;
  /** Título que o documento recebe se o campo ficar vazio. */
  defaultTitle: string;
}

/**
 * Dados opcionais do documento gerado, para já nascer organizado. Ficam recolhidos para o
 * formulário não crescer (principalmente com vários links); o cabeçalho avisa se algo foi preenchido.
 */
export function JobDocumentFields({
  defaultTitle,
  ...fields
}: JobDocumentFieldsProps) {
  const categories = useCategories();
  const { details } = VideoUrlStrings;
  const filled =
    fields.title.trim() !== "" || fields.category.length > 0 || fields.tags.length > 0;

  return (
    <Collapsible className="rounded-md border border-dashed">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-left text-sm">
        <span className="font-medium">{details.title}</span>

        <span className="text-muted-foreground">({details.optional})</span>

        {filled && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {details.filled}
          </span>
        )}

        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent keepMounted>
        <section aria-label="Dados da página" className="space-y-4 p-4 pt-1">
          <p className="text-sm text-muted-foreground">
            O que você preencher já vem pronto quando a página chegar para classificação; dá para
            ajustar na hora de adicionar à biblioteca.
          </p>

          <DocumentFields
            idPrefix={fields.idPrefix}
            title={fields.title}
            onTitleChange={fields.onTitleChange}
            titlePlaceholder={`Se vazio: ${defaultTitle}`}
            titleDisabledReason={fields.isBatch ? VideoUrlStrings.titleOnlyForOne : undefined}
            category={fields.category}
            onCategoryChange={fields.onCategoryChange}
            categoryOptions={categories.data ?? []}
            tags={fields.tags}
            onTagsChange={fields.onTagsChange}
            disabled={fields.disabled}
          />
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
