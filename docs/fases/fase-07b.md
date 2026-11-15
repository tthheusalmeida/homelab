# Fase 07b — Livros, escrita

Status: concluída

## O que foi feito
- Canais `library:books:create|update|delete|set-structure|add-chapter|mark-chapter-read|reset-progress|set-position` no `BookHandler` (agora com as portas `BookReader` e `BookWriter`), contratos em `shared/contracts/books.ts`. O `BookService` já era resolvido na 07a.
- `books-api.ts` (override) passou a ser **inteiro por IPC** e não importa mais `#lib/api`.
- O handler valida só que `modules` é uma lista (mesma mensagem do controller); o resto das regras de módulos, capítulos e progresso continua no `BookService`.
- Payloads e erros registrados em `ipc-canais.md` (tabela dos livros unificada, com payload e retorno).
- Verificado no Electron real (CDP, biblioteca temporária, arquivo `_livros/<id>.json` conferido no disco): criar (com texto aparado), estrutura, adicionar capítulo, marcar lido e concluir (`completedAt`), desmarcar, posição, reiniciar progresso, editar, apagar (arquivo some) e todos os erros (`VALIDATION` e `NOT_FOUND`). Na tela, o modo leitura salvou a posição ao rolar um capítulo longo (de `null` para o capítulo), por IPC e **sem nenhuma requisição HTTP**. O único tráfego de rede visto foi a imagem de capa externa de teste.
- Os exemplos de mensagem nos testes unitários do handler são do service falso; as mensagens reais são as da tabela de `ipc-canais.md`, conferidas no app.

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
