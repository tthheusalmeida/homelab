# Fase 06b — Biblioteca, escrita

Status: pendente

## Objetivo
Criar, editar, publicar, arquivar e apagar documentos por IPC.

## Escopo
- No `LibraryHandler`: `library:reindex`, `library:documents:create-article`, `:publish`, `:update`, `:suggest`, `:archive`, `:delete`.
- Front: restante de `pages/library/api/library.ts` passa a IPC.
- `suggest` usa o `LibraryClassifier` e o modelo mais barato (regra em `back/doc/library.md`); falha de IA vira `PROVIDER_FAILED`.
- Regras de nome de arquivo, categoria e frontmatter não mudam.

## Testes unitários
- Handler: cada canal; payload inválido → `VALIDATION`; conflito de nome/categoria com a mensagem atual; `delete` e `archive` de inexistente → `NOT_FOUND`.
- Front: mutações mockando `window.api` e invalidação de cache como hoje.

## O que testar
1. Novo artigo: criar, ver no Acervo e abrir o arquivo `.md` na pasta (frontmatter correto).
2. Entrada: adicionar à biblioteca (com categoria e tags), descartar, e checar o arquivo movido/removido.
3. Editar um documento (título, categoria, tags, conteúdo) e conferir a prévia "Como vai ficar na biblioteca".
4. Sugestão com IA: preenche categoria e tags.
5. Arquivar e apagar; "Reindexar" após mexer em arquivos manualmente.

## Critério de aceite
Biblioteca inteira por IPC, sem chamadas HTTP `library/documents*`.
