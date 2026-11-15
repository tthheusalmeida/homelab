# Fase 06a — Biblioteca, leitura

Status: concluída

## O que foi feito
- Canais `library:documents:list|get`, `library:inbox`, `library:categories`, `library:tags`, `library:index` (`shared/channels.ts`, `shared/contracts/library.ts`) e `LibraryHandler` (porta `LibraryReader`). `BackServices` resolve o `LibraryService` dentro do `LibraryModule`.
- Override `renderer/overrides/library-api.ts` (cópia de `library/api/library.ts`): leituras por IPC; `reindex`, publicar, arquivar, descartar, criar, sugerir e editar continuam por HTTP até a 06b. O `buildDocumentsQuery` (montava a query string) deu lugar a `toListFilters`, com as mesmas regras (texto aparado, vazio omitido, listas só com itens).
- Payload exato dos filtros registrado em `ipc-canais.md`.
- **Sem `NOT_CONFIGURED`:** a pasta da biblioteca é obrigatória nas Configurações (padrão em Documentos/HomeLab) e o back trata pasta inexistente como vazia, então esse erro não ocorre; não criei código para um caso que não existe. O item 4 de "O que testar" não se aplica.
- Sem paginação: o back devolve a lista inteira (nada a repassar).
- Verificado no Electron real (CDP, biblioteca temporária): todos os filtros, busca por metadados e por conteúdo, erros `VALIDATION`/`NOT_FOUND`, telas Acervo, Entrada e Documento, e sincronização ao criar um `.md` na pasta. O único HTTP de biblioteca foi o `POST /library/reindex` (escrita) com seu preflight `OPTIONS`.

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
