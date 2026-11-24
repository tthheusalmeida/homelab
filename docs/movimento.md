# Movimento (transições e animações)

Tudo que entra ou sai da tela se move de forma suave; nada aparece "de repente". As regras ficam em `renderer/src/global.css` (seção "Movimento") e valem para as duas janelas.

## Réguas
- Tempos: `--duration-quick` 150 ms (cor, borda, sombra), `--duration-enter` 450 ms, `--duration-exit` 240 ms. Curvas: `--ease-out-soft` (entrada) e `--ease-in-soft` (saída).
- `prefers-reduced-motion: reduce`: toda animação e transição cai para 0,01 ms (bloco no fim do `global.css`). Não é preciso tratar caso a caso.

## Utilities (Tailwind)
| Classe | Efeito |
|---|---|
| `animate-enter` | sobe 14 px e aparece (padrão para blocos, cards e itens de lista) |
| `animate-enter-fade` | só aparece (mensagens de erro, indicadores, a IA em uso e a contagem de seções do infográfico) |
| `animate-enter-scale` | cresce de 96% a 100% |
| `animate-enter-left` | entra pela esquerda |
| `animate-enter-right` | entra pela direita (painel lateral do modo leitura) |
| `animate-exit-right` | sai pela direita (o painel lateral do modo leitura fica na tela durante a saída e só então é removido) |
| `animate-exit-down` | desce 14 px e some (saídas) |
| `animate-confetti` | peça de confete: sai da origem até `--dx`/`--dy` (desacelera), cai `--fall` girando `--rot` e some em ~1,8 s; `--i` escalona 8 ms por peça (agradecimento do convite de apoio) |
| `animate-implosion` / `animate-hex-spin` | implosão da logo numa linha do tempo de ~3,4 s: os três hexágonos giram e encolhem (cada vez mais rápido), viram um ponto e voltam crescendo e girando até a posição certa; `-spin` gira cada hexágono em torno de si |
| `animate-critical` | clarão do ponto crítico da implosão (cresce e se dissolve, na mesma linha do tempo) |
| `animate-collapse-down` / `-up` | abre e fecha a altura do painel (usam `--collapsible-panel-height` do base-ui) |

**Cascata em listas:** defina `style={{ "--i": index } as CSSProperties}` no item. O atraso é `--i × 70 ms`, com teto de 700 ms.

## Onde já está aplicado
- **Troca de página:** `AppLayout` remonta o bloco da página a cada rota (`key={pathname}`) com `animate-enter-fade` (**só opacidade**, a página não sobe: decisão do usuário).
- **Carregando → conteúdo:** o conteúdo carregado de cada página (documento, livro, uso, jobs, livros, edição, criar) e o `LoadingState` entram com `animate-enter-fade`, para o conteúdo não aparecer de repente depois do "Carregando".
- **Detalhes:** chips de tag entram com `animate-enter-scale`; ícones de status de job e de etapa trocam com um "pop" e as cores têm transição de 300 ms; filhos de categoria expandidos, modo leitura e sugestão da IA entram com fade; cards de página, de job e de tipo de job ganham sombra e borda no hover.
- **Listas e grades:** cards da Home (serviços e visão geral), mensagens do Chat e "Pensando", cards do Uso, jobs (criar e acompanhar), páginas da Biblioteca, Entrada e livros.
- **Estados:** `EmptyState`, `ErrorState`, aviso de job criado, mensagens de erro de formulários e diálogos.
- **Painéis recolhíveis:** `#ui/collapsible` (cards das Configurações e jobs) abre e fecha a altura.
- **Barras de progresso:** a largura anima (`transition-[width]`, 700 ms) no Uso e no progresso do livro.
- **Snackbar e aviso de reinício** das Configurações: entram e o snackbar sai com `animate-exit-down` antes de sair do DOM (`SNACKBAR_EXIT_MS`). A barra de progresso do snackbar usa `animate-countdown` (a duração vem de `animation-duration`).
- **Controles:** `a`, `button`, `input`… têm transição de cor, borda, sombra e opacidade (`@layer base`); botões afundam um pouco ao clicar.
- Já animavam (shadcn): diálogos, sheets, tooltips. **Selects, menus e listas de sugestão** só mudam de **opacidade** ao abrir e fechar (`popupSurface` em `ui/popup.tsx`, 150 ms): sem zoom nem deslize, que faziam a lista tremer.

## Como aplicar em componente novo
1. Item ou bloco que aparece com o conteúdo: `animate-enter` (e `--i` se for lista).
2. Aparece depois de uma ação (erro, aviso): `animate-enter-fade` ou `animate-enter`.
3. Precisa sair com animação: mantenha no DOM, troque para `animate-exit-down` e remova depois de `--duration-exit` (veja o `Snackbar`).
4. Em grade, use um invólucro `animate-enter [&>*]:h-full` para o card continuar preenchendo a célula.
5. Não crie `@keyframes` soltos nem durações novas: use as réguas. Os keyframes do app começam com `hl-` de propósito: `enter`, `exit` e `collapsible-*` já existem no `tw-animate-css` (com opacidade fixa em 1) e reusar o nome faz a animação rodar sem efeito visível. O teste `motion.test.tsx` barra isso.

Testes: `renderer/src/motion.test.tsx` (utilities, `prefers-reduced-motion`, cascata, troca de rota, collapsible) e o do `Snackbar`.
