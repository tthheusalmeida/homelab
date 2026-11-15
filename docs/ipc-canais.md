# Canais IPC (inventário)

Origem: os 37 endpoints HTTP atuais (`/api/v1`) + os canais novos de app, settings e providers. Convenção: `<domínio>:<ação>`; payload e retorno seguem o DTO/rota atual (ver `regras/back/`). Todos respondem `IpcResult<T>` (ver `arquitetura.md`). Status de cada grupo em `migracao.md`.

## app (fases 02, 03a e 03b)
| Canal | Payload | Retorno |
|---|---|---|
| `app:ping` | — | `"pong"` |
| `app:version` | — | versão do app |
| `app:relaunch` | — | nada (reinicia o app para aplicar configuração) |
| `app:open-settings` | — | nada (abre ou foca a janela de Configurações) |

## settings (fases 03a e 03b, novos)
| Canal | Payload | Retorno |
|---|---|---|
| `settings:get` | — | `{ libraryDir, inboxDir, videoTempDir, audioTempDir }` |
| `settings:update` | parte das pastas (`Partial`) | `{ value: pastas, restartRequired }`; pasta inválida → `VALIDATION` |
| `appearance:get` | — | `{ theme: system|light|dark, accent: cyan|blue|indigo|violet|emerald|rose|orange }` |
| `appearance:update` | parte da aparência (`Partial`) | a aparência completa; tema ou cor desconhecidos → `VALIDATION`; não pede reinício |
| `settings:pick-folder` | `{ defaultPath? }` | pasta escolhida no seletor do sistema, ou `null` se cancelar |

## providers externos (fase 03a, novos)
| Canal | Payload | Retorno |
|---|---|---|
| `providers:external:list` | — | `[{ id, label, configured, maskedKey }]` |
| `providers:external:get` | `{ id }` | idem, de um provider; desconhecido → `NOT_FOUND` |
| `providers:external:save` | `{ id, apiKey }` | `{ value: info, restartRequired }`; chave vazia → `VALIDATION` |
| `providers:external:test` | `{ id, apiKey? }` | `{ ok, message }` (testa a chave candidata ou a salva) |

## providers locais (fase 03a, novos)
| Canal | Payload | Retorno |
|---|---|---|
| `providers:local:list` | — | `[{ id, label, editable, config }]` (`whisper`, `ollama`, `ffmpeg`) |
| `providers:local:get` | `{ id }` | idem, de um provider |
| `providers:local:save` | `{ id, config }` | `{ value: info, restartRequired }`; `ffmpeg` não é editável → `VALIDATION` |
| `providers:local:test` | `{ id, config? }` | `{ ok, message }` (testa a config candidata ou a salva) |

`config` do Whisper: `{ directory, executable, model }`. Do Ollama: `{ url }`. O ffmpeg não tem config.

## health (fase 4, implementado)
| Canal | Substitui | Retorno |
|---|---|---|
| `health:system` | `GET health/system` | `{ service, description, checks: [{ service, description, status }] }` |
| `health:ai` | `GET health/ai` | idem, com um check por provider (`ollama`, `gemini`) |

`status` é `ok` ou `error`. Provider fora do ar vira `error` no próprio check; o canal continua `ok: true`.

## ai (fase 4, implementado)
| Canal | Substitui | Payload | Retorno |
|---|---|---|---|
| `ai:providers` | `GET ai/providers` | — | `[{ id, label }]` |
| `ai:models` | `GET ai/providers/:providerId/models` | `{ providerId }` | modelos (`id`, `label`, `name`, `provider`, `details`, `capabilities`, `thinking?`) |
| `ai:thinking` | `GET ai/thinking` | `{ providerId, modelId }` | `[{ id, label }]` |
| `ai:usage` | `GET ai/usage` | `{ provider? }` | `{ summary, byProvider, byModel, timeline, recentRequests }` |

Erros: Gemini sem chave → `NOT_CONFIGURED` (mensagem manda abrir Configurações); provider desconhecido ou Ollama fora do ar em `ai:models` → `INTERNAL`, com a mesma mensagem em português do back (hoje é HTTP 500).

## chat (fase 5, implementado)
| Canal | Substitui | Payload | Retorno |
|---|---|---|---|
| `chat:send` | `POST chat` | `{ message, modelId, providerId, thinking? }` | `{ message }` |

Erros: falha do provider (Gemini ou Ollama) → `PROVIDER_FAILED` com a mensagem de hoje (ex.: "A requisição para o chat do Ollama falhou."); Gemini sem chave → `NOT_CONFIGURED`. A conversão para `PROVIDER_FAILED` fica no `ChatHandler` (o mapper genérico não sabe a origem do erro). O IPC não é cancelável: o cancelamento do Chat é só no renderer (rejeita com `AbortError` e descarta a resposta); a requisição já enviada termina no main e conta no Uso.

## library (fases 6a e 6b)
| Canal | Substitui | Payload | Retorno | Fase |
|---|---|---|---|---|
| `library:documents:list` | `GET library/documents` | `{ q?, category?, type?, source?, tags?, status?, sort? }` | lista de resumos (`DocumentSummary`) | 6a (feito) |
| `library:documents:get` | `GET library/documents/:id` | `{ id }` | `{ meta, content }` | 6a (feito) |
| `library:inbox` | `GET library/inbox` | — | resumos `pending`, mais recentes primeiro | 6a (feito) |
| `library:categories` | `GET library/categories` | — | árvore `{ name, path, count, children }` (só publicados) | 6a (feito) |
| `library:tags` | `GET library/tags` | — | `[{ tag, count }]` | 6a (feito) |
| `library:index` | `GET library/index` | — | `{ total, errors: [{ file, message }] }` | 6a (feito) |

Filtros de `library:documents:list` (iguais aos parâmetros de query de hoje, mas `category` e `tags` já são listas): `q` busca em título, nome do arquivo, tags, categorias e conteúdo; `category` é o caminho por nível (documentos dentro dele); `tags` exige todas; `type` (`summary`, `transcription`, `article`), `source` (`video`, `manual`), `status` (padrão `published`; também `archived`, `pending`) e `sort` (`title` padrão, ou `recent`). Valor fora dessas listas → `VALIDATION`; documento inexistente → `NOT_FOUND`. Não há paginação (o back devolve a lista inteira).

Erros da escrita: `category` e `tags` que não são lista de textos → `VALIDATION` com "O campo "category" deve ser uma lista de textos." (validação no `LibraryHandler`, como o controller fazia); título ou conteúdo vazio, documento já publicado, editar o que não está publicado e descartar publicado → `VALIDATION` com a mensagem do service; id inexistente → `NOT_FOUND`; falha da IA em `suggest` → `PROVIDER_FAILED` ("Não foi possível obter a sugestão da IA. Tente novamente." ou "A IA não retornou uma sugestão válida..."); `suggest` sem chave do Gemini → `NOT_CONFIGURED`.

A pasta da biblioteca não gera `NOT_CONFIGURED`: ela é obrigatória nas Configurações (com padrão em Documentos/HomeLab) e o back trata pasta inexistente como vazia.
| `library:reindex` | `POST library/reindex` | — | `{ indexed, errors }` | 6b (feito) |
| `library:documents:create-article` | `POST library/documents/article` | `{ title, category, tags?, content }` | documento (`{ meta, content }`), já publicado | 6b (feito) |
| `library:documents:publish` | `POST library/documents/:id/publish` | `{ id, title?, category, tags? }` | documento; move o arquivo da entrada (ou de arquivado) para a pasta da categoria | 6b (feito) |
| `library:documents:update` | `PATCH library/documents/:id` | `{ id, title?, category?, tags?, content? }` (só o informado muda) | documento; renomeia/move o arquivo se título ou categoria mudarem | 6b (feito) |
| `library:documents:suggest` | `POST library/documents/:id/suggest` | `{ id, modelId? }` | `{ title, category, tags, model }` (sem `modelId`, usa o modelo mais barato) | 6b (feito) |
| `library:documents:archive` | `POST library/documents/:id/archive` | `{ id }` | documento com `status: archived` (o arquivo continua na pasta) | 6b (feito) |
| `library:documents:delete` | `DELETE library/documents/:id` | `{ id }` | nada (só pendente ou arquivado; publicado → `VALIDATION`) | 6b (feito) |

## livros (fases 7a e 7b)
| Canal | Substitui | Payload | Retorno | Fase |
|---|---|---|---|---|
| `library:books:list` | `GET library/books` | `{ documentId? }` | resumos dos livros (capa, progresso, `moduleCount`; com `documentId`, cada um traz `containsDocument`) | 7a (feito) |
| `library:books:get` | `GET library/books/:id` | `{ id }` | livro com módulos e capítulos (`available` é `false` se o documento saiu da biblioteca) e `readDocumentIds` | 7a (feito) |
| `library:books:read` | `GET library/books/:id/read` | `{ id }` | livro + conteúdo dos capítulos disponíveis (os indisponíveis ficam de fora) | 7a (feito) |
| `library:books:search` | `GET library/books/:id/search` | `{ id, q }` | até 50 trechos (`documentId`, `chapterTitle`, `moduleId`, `moduleTitle`, `line`, `snippet`), no máximo 3 por capítulo | 7a (feito) |
| `library:books:create` | `POST library/books` | `{ title, kind?, description?, subtitle?, coverColor?, coverImageUrl? }` | livro (`BookDetail`) | 7b (feito) |
| `library:books:update` | `PATCH library/books/:id` | `{ id, title?, kind?, description?, subtitle?, coverColor?, coverImageUrl? }` (só o informado muda) | livro | 7b (feito) |
| `library:books:delete` | `DELETE library/books/:id` | `{ id }` | nada (apaga o arquivo do livro; os documentos ficam) | 7b (feito) |
| `library:books:set-structure` | `PUT library/books/:id/structure` | `{ id, modules: [{ id?, title?, documentIds }] }` | livro (módulos novos ganham id) | 7b (feito) |
| `library:books:add-chapter` | `POST library/books/:id/chapters` | `{ id, documentId, moduleId? }` | livro (sem módulo, entra no último) | 7b (feito) |
| `library:books:mark-chapter-read` | `PUT library/books/:id/chapters/:documentId/read` | `{ id, documentId, read }` | livro (todos lidos → `completedAt`) | 7b (feito) |
| `library:books:reset-progress` | `DELETE library/books/:id/progress` | `{ id }` | livro sem lidos, posição nem conclusão | 7b (feito) |
| `library:books:set-position` | `PUT library/books/:id/position` | `{ id, documentId, elementId }` | livro com `lastPosition` | 7b (feito) |

Leitura: a única "query" do `list` é o `documentId` (vazio ou ausente lista sem marcar `containsDocument`). A busca ignora acento e maiúscula, exige todas as palavras e, com termo vazio ou só de espaços, devolve lista vazia (não é erro). Livro inexistente em qualquer canal → `NOT_FOUND` ("Livro não encontrado.").

Escrita: `modules` que não é lista → `VALIDATION` com "O campo "modules" deve ser uma lista." (validação no `BookHandler`, como o controller fazia). O resto das regras vem do `BookService`, com a mensagem de hoje e `VALIDATION`: título vazio, tipo ou cor de capa inválidos, imagem de capa que não é URL http(s), documento fora da biblioteca na estrutura ou como capítulo, capítulo repetido, módulo inexistente e capítulo que não está no livro (também em `mark-chapter-read` e `set-position`).

## jobs (fase 8, implementado)
| Canal | Substitui | Payload | Retorno |
|---|---|---|---|
| `jobs:list` | `GET jobs` | — | jobs (`id`, `name`, `label`, `status`, `steps`, `createdAt`, `startedAt?`, `completedAt?`, `error?`; datas em texto ISO) |
| `jobs:types` | `GET jobs/types` | — | `[{ type, label, description, steps: [{ name, label }] }]` |
| `jobs:get` | `GET jobs/:id` | `{ id }` | um job; inexistente → `NOT_FOUND` |
| `jobs:create-video-to-transcript` | `POST jobs/video-to-transcript` | `{ url, title?, category?, tags? }` | `{ id, status }` (status `pending`) |
| `jobs:create-video-to-summary` | `POST jobs/video-to-summary` | `{ url, providerId, modelId, thinking?, detail?, title?, category?, tags? }` | `{ id, status }` (status `pending`) |

Criar um job valida **antes** de enfileirar (título de texto com até 120 caracteres; `category` e `tags` listas de textos; categoria de 1 a 4 níveis; ver `regras/back/jobs.md`): se algo for inválido responde `VALIDATION` com a mensagem de hoje e **nenhum job é criado**. `detail` desconhecido não é erro: vale `detailed` (regra do back). O job entra na fila e responde na hora; os jobs rodam **um por vez**, na ordem de chegada. Falha do pipeline (download, ffmpeg, Whisper, IA) **não** é erro do canal: o job termina `failed` com a mensagem em `error` (ex.: "Modelo Whisper não encontrado: ..."), e a fila segue. O acompanhamento é por consulta (`jobs:list`, a cada 1 s no front).

## Regras
- Um endpoint HTTP = um canal. `:id` e query viram campos do payload.
- Erros HTTP de hoje: 404 → `NOT_FOUND`, 400 → `VALIDATION`, 502 → `PROVIDER_FAILED` (falha de serviço externo, como a IA), demais → `INTERNAL`. Um erro que traz um `IpcError` `NOT_CONFIGURED` na `cause` (ex.: sugestão de IA sem chave) responde `NOT_CONFIGURED`.
- Antes de implementar cada grupo, confira o controller e o DTO atual e registre aqui o payload exato.
