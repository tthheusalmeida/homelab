import type { ReactNode } from "react";

import { ExternalLink } from "#components/ExternalLink";
import { Collapsible, CollapsibleContent } from "#ui/collapsible";

export interface SetupStep {
  /** O que fazer neste passo. */
  text: ReactNode;
  /** Endereço de apoio, mostrado como link externo ao fim do passo. */
  link?: { href: string; label: string };
}

interface SetupGuideProps {
  title: string;
  steps: readonly SetupStep[];
  /** Mostra o guia; quando vira `false` (ex.: a chave foi salva) ele se recolhe com transição. */
  visible: boolean;
  /** Observação final (ex.: limites do plano gratuito). */
  note?: ReactNode;
}

/**
 * Passo a passo para configurar um serviço (ex.: criar a chave de API). Aparece enquanto o
 * serviço não está configurado e some depois. Serve a qualquer serviço novo: basta passar os passos.
 */
export function SetupGuide({ title, steps, visible, note }: SetupGuideProps) {
  return (
    <Collapsible open={visible}>
      <CollapsibleContent>
        <section
          aria-label={title}
          className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <h3 className="text-sm font-semibold">{title}</h3>

          <ol className="flex flex-col gap-2.5">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                >
                  {index + 1}
                </span>

                <span className="min-w-0 text-muted-foreground">
                  <span className="text-foreground">{step.text}</span>
                  {step.link && (
                    <>
                      {" "}
                      <ExternalLink href={step.link.href}>
                        {step.link.label}
                      </ExternalLink>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>

          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
