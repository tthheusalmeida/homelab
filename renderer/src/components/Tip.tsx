import type { ReactElement, ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "#ui/tooltip";

/** Espera antes de o tooltip aparecer (ms): curta, para o controle sem texto se explicar logo. */
export const TIP_DELAY_MS = 200;

interface TipProps {
  /** O texto do tooltip. Vazio (`undefined`, `null`, `false` ou `""`) = sem tooltip, e o controle fica como está. */
  content?: ReactNode | false;
  /** O controle que ganha o tooltip: um elemento que aceita `ref` e as props do DOM (botão, link, span...). */
  children: ReactElement;
  /** Lado em que o tooltip abre. */
  side?: "top" | "bottom" | "left" | "right";
  /** Espera antes de aparecer (ms). */
  delay?: number;
  /**
   * Controle desabilitado não recebe o mouse e por isso não mostra tooltip: com `wrap`, um invólucro
   * focável recebe o mouse e o foco no lugar dele (use para explicar *por que* está desabilitado).
   */
  wrap?: boolean;
}

/**
 * **O** tooltip do app: use no lugar do atributo `title` do navegador, que não segue o tema nem a
 * identidade. A árvore é sempre a mesma, com ou sem texto (só o tooltip liga e desliga), então o
 * controle não é remontado quando o texto aparece ou some.
 */
export function Tip({ content, children, side = "top", delay = TIP_DELAY_MS, wrap = false }: TipProps) {
  const enabled = content !== undefined && content !== null && content !== false && content !== "";
  const trigger = wrap ? (
    <span tabIndex={enabled ? 0 : undefined} className="inline-flex">
      {children}
    </span>
  ) : (
    children
  );

  return (
    <Tooltip disabled={!enabled}>
      <TooltipTrigger delay={delay} render={trigger} />

      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
