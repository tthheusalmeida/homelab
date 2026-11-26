import { useMemo } from "react";

import katex from "katex";

import { splitMath } from "#shared/math-text";

/** Fórmula inválida não derruba a tela: o KaTeX mostra o texto cru, em vermelho. */
function renderFormula(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false });
}

/**
 * Um texto curto (termo de mapa mental, item de infográfico) com fórmulas em `$...$` desenhadas
 * pelo KaTeX. Sem fórmula, é só o texto. Para Markdown corrido, o `MarkdownMessage` faz o mesmo
 * pelos plugins `remark-math` e `rehype-katex`.
 */
export function MathText({ children }: { children: string }) {
  const segments = useMemo(() => splitMath(children), [children]);

  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === "math" ? (
          <span
            key={index}
            className="whitespace-nowrap"
            dangerouslySetInnerHTML={{ __html: renderFormula(segment.value) }}
          />
        ) : (
          segment.value
        ),
      )}
    </>
  );
}
