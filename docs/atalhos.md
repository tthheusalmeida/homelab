# Atalhos, paleta de comandos e notificações

## Paleta de comandos (Ctrl K)
- `Ctrl+K` (ou `Cmd+K`) em qualquer tela, o botão **Buscar** do cabeçalho, ou `/` fora de campos de texto. Código: `components/CommandPalette.tsx`.
- Lista todas as telas do menu (filtra sem diferenciar acento e caixa) e, com 2 letras ou mais, busca **páginas da biblioteca** pelo texto (`library:documents:list`, até 6 resultados). Setas movem, Enter abre, Esc fecha.

## Buscar no texto (Ctrl F)
- `Ctrl+F` (ou `Cmd+F`) abre uma **barra flutuante** no canto da janela (acima do modo leitura) e foca o campo, no **livro** e nas **páginas da biblioteca** (transcrição, resumo e demais). No livro o campo do painel (modo normal) e da barra de cima (modo leitura) continua, com a lista de ocorrências no painel. Não vale no mapa mental nem no infográfico. Esc limpa o texto; com o campo vazio, fecha a barra.
- Código único: `hooks/use-find.ts` (estado, Ctrl+F e destaque) + `components/FindBar.tsx` (campo, "3 de 12" e setas). Para ligar em outra tela: `const find = useFind(container, versão)` e `<FindBar floating {...find.barProps} onClose={find.close} />`.
- Como casa: a **frase inteira** primeiro ("casa da vida", ignorando acento, caixa e quebra de linha); se não existe, cada palavra em **qualquer pedaço de palavra** ("casa" acha "casamento" e "encasar"), sem conectores de até 2 letras quando há palavras maiores (`lib/find.ts`, `shared/search-words.ts`). Enter vai para a próxima, Shift+Enter para a anterior.

## Atalhos "G e uma letra" (estilo terminal)
Pressione `G` e, em até 1,2 s, a letra da tela. Só valem fora de campos de digitação e sem Ctrl/Alt/Cmd. Definidos em `lib/shortcuts.ts` (`GO_SHORTCUTS`) e aplicados por `hooks/use-app-shortcuts.ts` no `AppLayout`.

| Atalho | Tela |
|---|---|
| `G H` | Início |
| `G P` | Páginas |
| `G L` | Livros |
| `G I` | Classificação |
| `G N` | Nova página |
| `G T` | Nova tarefa |
| `G A` | Em andamento |
| `G C` | Conversa |
| `G U` | Consumo |

## Notificação do sistema
Quando um job termina (concluído ou com falha) e **nenhuma janela do app está em foco**, o main mostra uma notificação do sistema operacional (`main/system-notifier.ts`, ligada ao `EventBackAlerts`). Clicar nela traz a janela principal para a frente. Com o app em foco só aparece o aviso na tela. Job **cancelado** pelo usuário não notifica.

## Testes
`lib/shortcuts.test.ts`, `lib/find.test.ts`, `hooks/use-find.test.tsx`, `components/FindBar.test.tsx`, `hooks/use-app-shortcuts.test.tsx`, `components/CommandPalette.test.tsx` (renderer) e `main/system-notifier.spec.ts` + `main/event-back-alerts.spec.ts` (main).
