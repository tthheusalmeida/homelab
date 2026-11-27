import { useState } from 'react';
import { Link } from 'react-router';
import { BookMarked } from 'lucide-react';

import { MarkdownFileIcon } from '#components/MarkdownFileIcon';
import { Tip } from '#components/Tip';
import { Button } from '#ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#ui/dialog';

import { referenceLabel, referenceTarget, type UsedReference } from '../references';
import { ChatStrings } from '../strings';

interface ChatReferencesPanelProps {
  /** Referências de toda a conversa, sem repetição (ver `usedReferences`). */
  references: UsedReference[];
}

/**
 * Botão "Referências (N)" no cabeçalho da conversa: abre a lista de **todas** as páginas usadas nas
 * respostas deste chat. Cada uma é um link para a página na seção, com quantas respostas a usaram.
 */
export function ChatReferencesPanel({ references }: ChatReferencesPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Só o ícone, no tamanho e no fundo dos seletores ao lado; o nome e a contagem ficam no tooltip. */}
      <Tip content={ChatStrings.referencesOpen(references.length)} side="bottom">
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-muted/50 hover:bg-muted"
          disabled={references.length === 0}
          aria-label={ChatStrings.referencesOpen(references.length)}
          onClick={() => setOpen(true)}
        >
          <BookMarked />
        </Button>
      </Tip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ChatStrings.referencesTitle}</DialogTitle>

            <DialogDescription>{ChatStrings.referencesDescription}</DialogDescription>
          </DialogHeader>

          <ul
            aria-label={ChatStrings.referencesTitle}
            className="flex max-h-[55dvh] flex-col gap-1 overflow-y-auto"
          >
            {references.map(({ reference, answers }) => (
              <li key={`${reference.documentId}#${reference.anchor ?? ''}`}>
                <Link
                  to={referenceTarget(reference)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <MarkdownFileIcon className="size-4 shrink-0 text-primary/80" />

                  <span className="min-w-0 flex-1 truncate">{referenceLabel(reference)}</span>

                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {ChatStrings.referenceAnswers(answers)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
