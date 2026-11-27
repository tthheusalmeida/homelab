import { Link } from "react-router";

import type { ChatReference } from "#shared/contracts/chat";
import { MarkdownFileIcon } from "#components/MarkdownFileIcon";

import { referenceLabel, referenceSection, referenceTarget } from "../references";

interface ChatReferencesProps {
  references: ChatReference[];
}

/** Um ícone de página; ao passar o mouse (ou focar), o nome abre **para a esquerda** e fecha ao sair. */
function ReferenceChip({ reference }: { reference: ChatReference }) {
  const section = referenceSection(reference);
  // O `[n]` do texto que aponta para esta página.
  const number = reference.number;

  return (
    <Link
      to={referenceTarget(reference)}
      aria-label={referenceLabel(reference)}
      className="group flex h-7 items-center rounded-md border border-transparent text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground focus-visible:border-border focus-visible:bg-card focus-visible:text-foreground"
    >
      {/* 0fr -> 1fr anima só a largura; fechado, o nome fica fora da vista (o leitor de tela lê o aria-label). */}
      <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-200 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]">
        <span className="min-w-0 overflow-hidden">
          <span className="block max-w-64 truncate pr-1 pl-2.5 whitespace-nowrap" aria-hidden="true">
            <span className="font-medium text-foreground">{reference.title}</span>
            {section && <span> › {section}</span>}
          </span>
        </span>
      </span>

      <span className="relative flex size-7 shrink-0 items-center justify-center text-primary/80 transition-colors group-hover:text-primary group-focus-visible:text-primary">
        <MarkdownFileIcon className="size-4" />

        {number !== undefined && (
          <span
            data-testid="reference-number"
            aria-hidden="true"
            className="absolute right-0.5 bottom-0.5 font-mono text-[9px] leading-none font-semibold text-foreground/70"
          >
            {number}
          </span>
        )}
      </span>
    </Link>
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
    <nav aria-label="Referências" className="flex w-full items-center gap-2">
      <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-border" />

      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">referências</span>

      <ul className="flex shrink-0 items-center justify-end gap-0.5">
        {references.map((reference) => (
          <li key={`${reference.documentId}#${reference.anchor ?? ""}`}>
            <ReferenceChip reference={reference} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
