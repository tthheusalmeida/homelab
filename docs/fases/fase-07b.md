# Fase 07b — Livros, escrita

Status: pendente

## Objetivo
Criar e manter livros e progresso por IPC.

## Escopo
- No `BookHandler`: `library:books:create`, `:update`, `:delete`, `:set-structure`, `:add-chapter`, `:mark-chapter-read`, `:reset-progress`, `:set-position`.
- Front: restante de `pages/library/books/api.ts` passa a IPC.
- Regras de módulos, capítulos e progresso em `back/doc/library.md` e `front/doc/library.md` não mudam.

## Testes unitários
- Handler: cada canal; payload inválido → `VALIDATION`; livro/capítulo inexistente → `NOT_FOUND`.
- Front: mutações mockando `window.api`.

## O que testar
1. Criar um livro, definir módulos e capítulos, adicionar um capítulo vindo da biblioteca.
2. Marcar capítulos como lidos e conferir o progresso; salvar posição, sair e voltar.
3. Reiniciar o progresso.
4. Renomear e apagar o livro; verificar os arquivos na pasta.

## Critério de aceite
Livros inteiros por IPC, sem chamadas HTTP `library/books*`.
