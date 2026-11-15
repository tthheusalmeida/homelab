# Fase 06a — Biblioteca, leitura

Status: pendente

## Objetivo
Navegar na biblioteca e no inbox por IPC.

## Escopo
- `LibraryHandler` com `library:documents:list`, `library:documents:get`, `library:inbox`, `library:categories`, `library:tags`, `library:index`.
- Front: `pages/library/api/library.ts` (apenas as funções de leitura) passa a usar IPC. O restante da biblioteca segue por HTTP até a 06b.
- Confirmar o payload exato dos filtros de `documents:list` no controller e registrar em `ipc-canais.md`.
- A pasta da biblioteca vem do `SettingsStore`; sem ela, `NOT_CONFIGURED`.

## Testes unitários
- Handler: cada canal com service mockado; filtros, busca e paginação repassados corretamente; documento inexistente → `NOT_FOUND`.
- Front: funções de leitura mockando `window.api`; `useLibrarySync` continua funcionando.

## O que testar
1. Acervo: listar, buscar e filtrar por categoria, tag e tipo, como antes.
2. Abrir um documento (modo leitura, sumário, destaque de busca).
3. Entrada (inbox): lista os documentos pendentes gerados pelos jobs.
4. Sem pasta da biblioteca configurada: mensagem clara levando às Configurações.
5. Alterar um arquivo `.md` direto na pasta: a sincronização reflete na tela.

## Critério de aceite
Todas as telas de leitura da biblioteca funcionam por IPC; escrita ainda por HTTP, sem conflito.
