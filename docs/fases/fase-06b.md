# Fase 06b — Biblioteca, escrita

Status: concluída

## O que foi feito
- Canais `library:reindex`, `library:documents:create-article|publish|update|suggest|archive|delete` no `LibraryHandler` (agora com as portas `LibraryReader`, `LibraryWriter` e `LibraryClassifierPort`) e contratos em `shared/contracts/library.ts`. `BackServices` resolve também o `LibraryClassifier`.
- `library-api.ts` (override) passou a ser **inteiro por IPC** e não importa mais `#lib/api`.
- **Mapper (`IpcErrorMapper`):** HTTP 502 → `PROVIDER_FAILED` (era `INTERNAL`), e um erro que traz um `IpcError` `NOT_CONFIGURED` na `cause` responde `NOT_CONFIGURED`. Motivo: o `LibraryClassifier` lança `BadGatewayException` (502) em falha de IA e esconde na `cause` a falta de chave do Gemini. Um teste antigo do mapper que usava 502 como exemplo de `INTERNAL` passou a usar 500 (mudança de regra).
- O handler repete só a validação de lista de textos (`category`, `tags`), com a mesma mensagem do controller; o resto das regras (nome de arquivo, categoria, frontmatter) continua nos services do back.
- Verificado no Electron real (CDP, biblioteca temporária, arquivos conferidos no disco): criar artigo (frontmatter correto), publicar da entrada (arquivo movido), editar (arquivo renomeado e movido), arquivar (arquivo fica), descartar (arquivo some), reindexar após criar um `.md` na mão, todos os erros acima e **nenhuma requisição HTTP** de biblioteca.
- **Não verificado ao vivo:** a sugestão com IA com chave real (só o caminho sem chave, `NOT_CONFIGURED`, e o 502 por teste unitário), e os cliques nas telas de Entrada e edição (os canais foram chamados direto; só conferi que a tela "Nova página" renderiza).

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
