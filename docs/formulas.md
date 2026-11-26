# Fórmulas matemáticas

Resumos, mapas mentais e infográficos mostram fórmulas desenhadas (KaTeX, empacotado, funciona offline) em vez do texto cru `$F_n = ...$`.

## Notação (a IA escreve, a tela desenha)
- **LaTeX entre cifrões:** `$F_n = F_{n-1} + F_{n-2}$` no meio do texto. No **resumo** (Markdown), fórmula importante ou longa pode ir em linha própria entre `$$`.
- **Dinheiro:** `R\$ 10` (com a barra). Sem a barra, `R$ 10 e R$ 20` pode ser lido como fórmula no resumo; no mapa a regra do pandoc (`$` de abrir sem espaço depois, `$` de fechar sem espaço antes nem dígito depois) já evita isso.
- **Ilegível:** se a fórmula do conteúdo estiver quebrada, a IA descreve em palavras em vez de inventar.
- Essas regras ficam no **contrato fixo** dos prompts (`ai/prompts/math-notation.ts`: `SUMMARY_MATH_RULES` e `JSON_MATH_RULES`), não nas instruções editáveis: personalizar o prompt não as remove.

## Onde é desenhada
- **Resumo (Markdown):** `MarkdownMessage` usa `remark-math` + `rehype-katex` (`throwOnError: false`). Vale também no chat. `$HOME` em código ou `echo $PATH` não viram fórmula. Fórmula inteira entre crases (a IA às vezes escreve `` `$a_n$` ``) é desenhada como fórmula: `displayMath` tira as crases; o prompt também as proíbe.
- **Mapa mental e infográfico:** são JSON de textos curtos, então usam o `MathText` (`components/MathText.tsx`), que separa prosa e fórmulas com `splitMath` e desenha só `$...$`. No infográfico, o `Txt` (que já envolve todo texto editável) passa strings por ele; no mapa, os termos e frases dos cartões.
- **Fórmula inválida** (ex.: chave sem fechar) aparece como texto cru em vermelho, sem quebrar a tela. Comando desconhecido aparece em vermelho dentro da própria fórmula.
- Telas de edição (campos de texto) mostram o LaTeX cru, para o usuário poder corrigir.

## Cuidados no back
- **`plainText`** (`shared/plain-text.ts`) é a limpeza de markdown dos textos da IA no mapa mental e no infográfico; ela **poupa** o que está entre `$...$` (senão `_`, `*` e `~` do LaTeX sumiriam: `F_{n-1}` virava `Fn-1`).
- **JSON com barra invertida:** a IA deve **dobrar** cada barra (`\frac`). Se escrever uma só, `repairJson` (`utils/json-answer.ts`) dobra dentro de `$...$` quando a barra vem seguida de duas letras ou mais (`\frac`, `\sqrt`, `\neq`); sem isso `\frac` virava "form feed + rac" sem erro e `\sqrt` quebrava a leitura. Fora de fórmula, `\n` continua sendo quebra de linha.
- A lógica de separar prosa e fórmula é uma só (`shared/math-text.ts`), usada pelo back e pelo renderer.

## Fora do escopo (por enquanto)
- Ler melhor as fórmulas do **PDF** (o texto extraído de uma fórmula vem desmontado). Caminho previsto: detectar a página suspeita no `PdfExtractor`, renderizá-la como imagem e transcrevê-la com uma IA de visão (ou OCR local, se for preciso OCR em PDFs de imagem).
- Validar o LaTeX no back e pedir nova resposta à IA: a tela já degrada com elegância.
