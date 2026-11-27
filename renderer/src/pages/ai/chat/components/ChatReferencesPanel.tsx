import { useState } from 'react';
import { Link } from 'react-router';
import { BookMarked } from 'lucide-react';

import { MarkdownFileIcon } from '#components/MarkdownFileIcon';
import { Tip } from '#components/Tip';
import { Button } from '#ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#ui/dialog';

import { referenceLabel, referenceTarget, type AnswerReferences } from '../references';
import { ChatStrings } from '../strings';

interface ChatReferencesPanelProps {
  /** As referências de cada resposta do chat, na ordem (ver `referencesByAnswer`). */
  answers: AnswerReferences[];
  /** Quantas páginas diferentes o chat usou (para o tooltip). */
  total: number;
}

/**
 * Botão de ícone no cabeçalho da conversa: abre as referências de **todas** as respostas deste chat,
 * agrupadas por resposta. Dentro de cada grupo, cada página traz o número da marca `[n]` que aquela
 * resposta usou no texto, e é um link para a página na seção.
 */
export function ChatReferencesPanel({ answers, total }: ChatReferencesPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Só o ícone, no tamanho e no fundo dos seletores ao lado; o nome e a contagem ficam no tooltip. */}
      <Tip content={ChatStrings.referencesOpen(total)} side="bottom">
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-muted/50 hover:bg-muted"
          disabled={answers.length === 0}
          aria-label={ChatStrings.referencesOpen(total)}
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

          <div className="flex max-h-[55dvh] flex-col gap-4 overflow-y-auto">
            {answers.map((answer) => (
              <section key={answer.id} aria-label={ChatStrings.referencesOfAnswer(answer.question)}>
                <p className="truncate px-2 font-mono text-[11px] text-muted-foreground">
                  {ChatStrings.referencesOfAnswer(answer.question)}
                </p>

                <ul className="mt-1 flex flex-col gap-0.5">
                  {answer.references.map((reference) => (
                    <li key={`${reference.documentId}#${reference.anchor ?? ''}`}>
                      <Link
                        to={referenceTarget(reference)}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:bg-muted"
                      >
                        {reference.number !== undefined && (
                          <span
                            data-testid="reference-number"
                            className="shrink-0 font-mono font-bold"
                          >
                            [{reference.number}]
                          </span>
                        )}

                        <MarkdownFileIcon className="size-4 shrink-0 text-primary/80" />

                        <span className="min-w-0 flex-1 truncate">{referenceLabel(reference)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
