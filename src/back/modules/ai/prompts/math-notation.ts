/**
 * Como a IA escreve fórmulas e cifrões. A tela desenha o LaTeX em `$...$` (o resumo também em
 * `$$...$$`); fórmula fora desse formato aparece como texto cru. Faz parte do contrato fixo dos
 * prompts: o usuário personaliza as instruções, mas não esta regra.
 */

const COMMON_RULES = `- **Fórmulas:** escreva toda fórmula, expressão matemática e símbolo (variável, índice, expoente, fração, raiz, letra grega) em LaTeX entre cifrões, como \`$F_n = F_{n-1} + F_{n-2}$\`. Mesmo uma expressão curta (\`$a_n$\`, \`$q^{n-1}$\`) vai entre cifrões: nunca escreva \`an\`, \`a1\`, \`q^{n-1}\` ou \`\\frac\` soltos no texto, porque sem os cifrões eles aparecem quebrados na tela. Esta regra vale mesmo que outra instrução peça "sem markdown". Nunca use \`\\( \\)\`, \`\\[ \\]\`, Unicode matemático (F₁, √5, ≥) nem crases ou bloco de código em volta da fórmula: os cifrões já bastam, sem nenhuma crase. Use fórmula só para matemática de verdade, não para enfeitar.
- **Dinheiro:** escreva o cifrão de valores como \`R\\$ 10\` (com a barra), para não virar fórmula.
- Se uma fórmula do conteúdo estiver ilegível ou incompleta, não a reconstrua nem a invente: descreva em palavras o que dá para entender.`;

/** O resumo é Markdown: fórmula em linha própria usa `$$ ... $$`. */
export const SUMMARY_MATH_RULES = `${COMMON_RULES}
- Fórmula importante ou longa vai em linha própria, entre \`$$\` (uma fórmula por bloco).`;

/** O mapa mental é JSON de textos curtos: só fórmula curta, em linha, com a barra dobrada. */
export const JSON_MATH_RULES = `${COMMON_RULES}
- Nesta resposta a fórmula é curta e fica dentro do texto (só \`$...$\`, nunca \`$$\`). Como o texto está dentro de um JSON, **dobre cada barra invertida**. Exemplo de note: \`"Vale $a_n = a_1 q^{n-1}$ e a soma é $S_n = \\\\frac{a_1 (q^n - 1)}{q - 1}$"\`.`;
