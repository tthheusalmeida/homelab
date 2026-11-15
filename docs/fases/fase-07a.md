# Fase 07a — Livros, leitura

Status: pendente

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
