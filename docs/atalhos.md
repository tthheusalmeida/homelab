# Atalhos, paleta de comandos e notificações

## Paleta de comandos (Ctrl K)
- `Ctrl+K` (ou `Cmd+K`) em qualquer tela, o botão **Buscar** do cabeçalho, ou `/` fora de campos de texto. Código: `components/CommandPalette.tsx`.
- Lista todas as telas do menu (filtra sem diferenciar acento e caixa) e, com 2 letras ou mais, busca **páginas da biblioteca** pelo texto (`library:documents:list`, até 6 resultados). Setas movem, Enter abre, Esc fecha.

## Atalhos "G e uma letra" (estilo terminal)
Pressione `G` e, em até 1,2 s, a letra da tela. Só valem fora de campos de digitação e sem Ctrl/Alt/Cmd. Definidos em `lib/shortcuts.ts` (`GO_SHORTCUTS`) e aplicados por `hooks/use-app-shortcuts.ts` no `AppLayout`.

| Atalho | Tela |
|---|---|
| `G H` | Início |
| `G P` | Páginas |
| `G L` | Livros |
| `G I` | Caixa de entrada |
| `G N` | Nova página |
| `G T` | Nova tarefa |
| `G A` | Em andamento |
| `G C` | Conversa |
| `G U` | Consumo |

## Notificação do sistema
Quando um job termina (concluído ou com falha) e **nenhuma janela do app está em foco**, o main mostra uma notificação do sistema operacional (`main/system-notifier.ts`, ligada ao `EventBackAlerts`). Clicar nela traz a janela principal para a frente. Com o app em foco só aparece o aviso na tela. Job **cancelado** pelo usuário não notifica.

## Testes
`lib/shortcuts.test.ts`, `hooks/use-app-shortcuts.test.tsx`, `components/CommandPalette.test.tsx` (renderer) e `main/system-notifier.spec.ts` + `main/event-back-alerts.spec.ts` (main).
