# Fase 07a — Livros, leitura

Status: concluída

## O que foi feito
- Canais `library:books:list|get|read|search` (`shared/channels.ts`, `shared/contracts/books.ts`) e `BookHandler` (porta `BookReader`). `BackServices` resolve o `BookService` dentro do `LibraryModule`.
- Override `renderer/overrides/books-api.ts` (cópia de `library/books/api.ts`): leituras por IPC; criar, editar, apagar, estrutura, capítulos, progresso e posição seguem por HTTP até a 07b.
- Payload do `list` conferido no controller: a única query é `documentId`. Registrado em `ipc-canais.md`, junto com a regra da busca (termo vazio → lista vazia, não é erro).
- Verificado no Electron real (CDP, biblioteca temporária; o livro foi montado pelo HTTP porque a escrita ainda não migrou): lista com progresso e `containsDocument`, detalhe, modo leitura, busca (sem acento, termo vazio e sem resultado), `NOT_FOUND`, capítulo arquivado (indisponível no `get`, fora do `read`, contagens certas) e as telas de Livros, Livro, leitura e livro inexistente. O único HTTP no navegador foi o `PUT .../position` que o modo leitura faz ao salvar a posição (escrita da 07b), com o preflight.

## Objetivo
Listar, abrir, ler e pesquisar livros por IPC.

## Escopo
- `BookHandler` com `library:books:list`, `:get`, `:read`, `:search`.
- Front: leitura em `pages/library/books/api.ts` passa a IPC; escrita segue por HTTP até a 07b.
- Rever o payload de `list` (filtros por query) no controller e registrar em `ipc-canais.md`.

## Testes unitários
- Handler: cada canal; livro inexistente → `NOT_FOUND`; termo de busca vazio conforme a regra atual.
- Front: funções de leitura mockando `window.api`.

## O que testar
1. Aba Livros: lista e filtros como antes.
2. Abrir um livro: módulos, capítulos e progresso corretos.
3. Modo leitura do livro (continuar de onde parou).
4. Pesquisa dentro do livro: resultados e destaque.

## Critério de aceite
Leitura de livros idêntica à de antes, por IPC.
