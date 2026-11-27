import { Link } from "react-router";

import type { ChatReference } from "#shared/contracts/chat";
import { MarkdownFileIcon } from "#components/MarkdownFileIcon";
import { Tip } from "#components/Tip";

import { referenceLabel, referenceSection, referenceTarget } from "../references";

interface ChatReferencesProps {
  references: ChatReference[];
}

/**
 * Uma referência: o número da marca (**[1]**, o mesmo do texto da resposta), o ícone da página e o
 * nome `Página › Seção`, sempre à vista. Quem lê a marca no texto acha aqui qual página é, sem
 * procurar na conversa.
 */
function ReferenceChip({ reference }: { reference: ChatReference }) {
  const section = referenceSection(reference);
  const number = reference.number;

  return (
    <Tip content={referenceLabel(reference)} side="top">
      <Link
        to={referenceTarget(reference)}
        aria-label={referenceLabel(reference)}
        className="flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:bg-card focus-visible:text-foreground"
      >
        {number !== undefined && (
          <span aria-hidden="true" className="shrink-0 font-mono font-bold text-foreground">
            [<span data-testid="reference-number">{number}</span>]
          </span>
        )}

        <MarkdownFileIcon className="size-3.5 shrink-0 text-primary/80" />

        <span className="min-w-0 truncate" aria-hidden="true">
          <span className="font-medium text-foreground">{reference.title}</span>
          {section && <span> › {section}</span>}
        </span>
      </Link>
    </Tip>
  );
}

/**
 * Páginas da biblioteca em que a resposta se apoiou. Um filete e a palavra "referências" (o sinal
 * discreto de que aquilo é fonte, como o rodapé de um texto) e, à direita, um ícone de página para
 * cada uma. A lista é montada pelo app, não pelo modelo.
 */
export function ChatReferences({ references }: ChatReferencesProps) {
  if (references.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Referências" className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">referências</span>

        <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-border" />
      </div>

      <ul className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {references.map((reference) => (
          <li key={`${reference.documentId}#${reference.anchor ?? ""}`} className="min-w-0 max-w-full">
            <ReferenceChip reference={reference} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
