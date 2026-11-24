import { useState } from "react";

import { Sparkles } from "lucide-react";

import { Button } from "#ui/button";

import { AiInUse } from "#components/AiInUse";

import { useSuggestClassification } from "../hooks/useLibrary";
import type { ClassificationSuggestion } from "../types/library.types";
import { useErrorAlert } from "#hooks/use-error-alert";

interface SuggestionPanelProps {
  documentId: string;
  /** Recebe a sugestão; quem usa decide o que preencher. */
  onSuggestion: (suggestion: ClassificationSuggestion) => void;
  disabled?: boolean;
}

/** Pede à IA em uso (padrão ou trocada na sessão) um título, categoria e tags para o documento. */
export function SuggestionPanel({
  documentId,
  onSuggestion,
  disabled,
}: SuggestionPanelProps) {
  const [usedModel, setUsedModel] = useState<string | null>(null);

  const suggest = useSuggestClassification();
  useErrorAlert(suggest.isError && "Não foi possível obter a sugestão. Tente novamente.");

  function handleSuggest() {
    suggest.mutate(
      { id: documentId },
      {
        onSuccess: (suggestion) => {
          setUsedModel(suggestion.model);
          onSuggestion(suggestion);
        },
      },
    );
  }

  return (
    <section
      aria-label="Sugestão da IA"
      className="space-y-2 rounded-md border border-dashed p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          loading={suggest.isPending}
          onClick={handleSuggest}
        >
          {!suggest.isPending && <Sparkles />}
          Sugerir com IA
        </Button>

        <AiInUse />
      </div>

      <p className="text-xs text-muted-foreground">
        A IA preenche título, categoria e tags (preferindo o que já existe na
        biblioteca). Você revisa e ajusta antes de adicionar.
      </p>

      {usedModel && !suggest.isError && (
        <p className="animate-enter-fade text-xs text-muted-foreground">
          Sugestão preenchida com {usedModel}.
        </p>
      )}

    </section>
  );
}
