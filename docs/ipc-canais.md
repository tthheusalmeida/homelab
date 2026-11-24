# Canais IPC (inventário)

Origem: os 37 endpoints HTTP atuais (`/api/v1`) + os canais novos de app, settings e providers. Convenção: `<domínio>:<ação>`; payload e retorno seguem o DTO/rota atual (ver `regras/back/`). Todos respondem `IpcResult<T>` (ver `arquitetura.md`). Status de cada grupo em `migracao.md`.

## app (fases 02, 03a e 03b)
| Canal | Payload | Retorno |
|---|---|---|
| `app:ping` | — | `"pong"` |
| `app:version` | — | versão do app |
| `app:relaunch` | — | nada (reinicia o app para aplicar configuração) |
| `app:open-settings` | — | nada (a janela principal vai para a rota Configurações, numa seção se informada) |
| `app:reveal-file` | `{ path }` (caminho completo) | `true` se mostrou o arquivo na pasta dele (botão "Ver" dos avisos de arquivo salvo); `false` se ele não existe mais |
| `app:restart-pending` | — | `boolean`: há alteração salva que só vale depois de reiniciar (estado do main, vale para todas as janelas) |
| `app:mark-restart-pending` | — | nada (marca o reinício como pendente e publica o evento `app:restart-needed` para todas as janelas) |

## updates (atualização do app; ver `atualizacoes.md`)
| Canal | Payload | Retorno |
|---|---|---|
| `updates:status` | — | `UpdateStatus`: `{ state: idle|checking|available|downloading|ready|installing, currentVersion, latest: { version, notes, url, publishedAt } | null, progress (0 a 100), error, checkedAt, canInstall, autoCheck }` |
| `updates:check` | — | o `UpdateStatus` depois de consultar o GitHub (falha de rede vira `error`, nunca exceção) |
| `updates:install` | — | o `UpdateStatus`. Com a versão `ready`, reinicia e instala (`quitAndInstall`); com o download automático falho (`available`), baixa só a diferença de novo. Fora do Windows abre a página do Release. Sem versão nova, não faz nada |
| `updates:set-auto-check` | `{ autoCheck: boolean }` | o `UpdateStatus` depois de gravar `updates.autoCheck` (valor que não é booleano: `VALIDATION`) |
| `updates:translation-available` | — | `{ available: boolean }`: `true` com o Ollama respondendo e ao menos um modelo de texto instalado (nunca lança: sem Ollama, `false`) |
| `updates:translate-notes` | — | `{ version, notes }` com as notas da versão nova em português, traduzidas pelo menor modelo do Ollama. O texto vem do estado do app, nunca do renderer. Sem versão nova ou sem notas: `VALIDATION`; sem IA local: `NOT_CONFIGURED`; falha do modelo: `PROVIDER_FAILED` |

Evento `updates:changed` (main → renderer): o `UpdateStatus` a cada mudança (nova versão, progresso, erro).

## settings (fases 03a e 03b, novos)
| Canal | Payload | Retorno |
|---|---|---|
| `settings:get` | — | `{ libraryDir }` (a única pasta que o usuário escolhe) |
| `settings:update` | `{ libraryDir? }` | `{ value, restartRequired }`; pasta inválida → `VALIDATION` (a tela usa `settings:move-library`) |
| `settings:inspect-library` | `{ path }` | `{ path, exists, empty, fileCount }` (o que há na pasta candidata) |
| `settings:move-library` | `{ to, mode: move|use, deleteOrigin? }` | `{ libraryDir, filesCopied, bytesCopied, originRemoved, originRemoveError?, restartRequired }`; progresso em `library-move:progress`; falha de cópia → `PERSIST_FAILED` (nada troca) |
| `appearance:get` | — | `{ theme: system|light|dark, accent: cyan|blue|indigo|violet|emerald|rose|orange, reading: { font, fontSize, zoom, background, backgroundShade, text, textShade, separator, separatorShade, pinSidebar, swapSides }, transcript: { preview, progress } }` (`reading` e `transcript`: ver `identidade.md`; `appearance:update` aceita cada um parcial) |
| `appearance:update` | parte da aparência (`Partial`; `reading` também pode vir parcial, só o que mudou) | a aparência completa; tema, cor, fonte, tamanho (8 a 32, de 2 em 2), zoom (70 a 200, de 10 em 10), cor (fundo, texto ou separadores), intensidade (50 a 950) ou painel lateral e inverter lados (booleanos) de leitura inválidos → `VALIDATION`; não pede reinício |
| `support:get` | — | `{ starPromptHidden: boolean }`: `true` quando a pessoa já estrelou ou dispensou o convite (`apoio.md`) |
| `support:update` | `{ starPromptHidden?: boolean }` | o valor salvo; fora do tipo → `VALIDATION` |
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
| `ai:selection` | (novo) | — | `{ configured, session, effective: { providerId, modelId, source } }`: a IA em uso (padrão salvo, troca da sessão e o que vale agora; ver `ia-padrao.md`) |
| `ai:session` | (novo) | `{ preference: { providerId, modelId | null } | null }` | o mesmo estado; troca a IA só nesta sessão (`null` volta ao padrão) |
| `ai:default-update` | (novo) | `{ preference: { providerId, modelId | null } | null }` | a preferência guardada em `settings.json` (`null` = automática); vale sem reiniciar |

Erros: Gemini sem chave → `NOT_CONFIGURED` (mensagem manda abrir Configurações); provider desconhecido ou Ollama fora do ar em `ai:models` → `INTERNAL`, com a mesma mensagem em português do back (hoje é HTTP 500).

## chat e chats (persistência)
| Canal | Payload | Retorno |
|---|---|---|
| `chat:send` | `{ chatId, message, modelId, providerId, thinking? }` | `{ message, chat }` (o chat atualizado, com todas as mensagens) |
| `chat:cancel` | `{ chatId }` | nada; descarta a resposta que ainda está sendo gerada |
| `chats:list` | — | resumos, do mais recente para o mais antigo (`id`, `title`, `createdAt`, `updatedAt`, `providerId`, `modelId`, `thinking?`, `messageCount`) |
| `chats:get` | `{ id }` | chat com `messages`; inexistente → `NOT_FOUND` |
| `chats:delete` | `{ id }` | nada; inexistente → `NOT_FOUND` |

O `chatId` é criado pela tela (uuid) ao abrir um chat novo; o chat **nasce com a primeira mensagem** (não existe canal para criar vazio). O main reenvia o **histórico inteiro** ao provedor. Pergunta e resposta só são gravadas **juntas, em caso de sucesso**. `chat:cancel` não interrompe a chamada ao provedor (os tokens são gastos): o main descarta a resposta quando ela chega (o `chat:send` responde `VALIDATION` "A resposta foi cancelada."). Um envio por chat por vez. Erros: falha do provedor → `PROVIDER_FAILED`; sem chave → `NOT_CONFIGURED`; mensagem vazia ou id inválido → `VALIDATION`; chat excluído enquanto respondia → `NOT_FOUND`; disco → o aviso `app:notice` (a conversa segue em memória).

## library (fases 6a e 6b)
| Canal | Substitui | Payload | Retorno | Fase |
|---|---|---|---|---|
| `library:documents:list` | `GET library/documents` | `{ q?, category?, type?, source?, tags?, has?, status?, sort? }` | lista de resumos (`DocumentSummary`) | 6a (feito) |
| `library:documents:get` | `GET library/documents/:id` | `{ id }` | `{ meta, content }` | 6a (feito) |
| `library:inbox` | `GET library/inbox` | — | resumos `pending`, mais recentes primeiro | 6a (feito) |
| `library:categories` | `GET library/categories` | — | árvore `{ name, path, count, children }` (a contagem é dos publicados; pastas sem páginas também aparecem, com contagem 0) | 6a (feito) |
| `library:categories:rename` | (novo, sem equivalente HTTP) | `{ from: string[], to: string[] }` (caminhos de 1 a 4 níveis) | `{ moved }` (páginas que mudaram de pasta) | edição de categorias |
| `library:categories:create` | (novo, sem equivalente HTTP) | `{ path: string[] }` (1 a 4 níveis; cria os níveis que faltarem) | `{ created: true }` | criar categoria vazia |
| `library:categories:delete` | (novo, sem equivalente HTTP) | `{ path: string[] }` | `{ deleted: true }` (só categoria sem páginas) | excluir categoria vazia |
| `library:tags` | `GET library/tags` | — | `[{ tag, count }]` | 6a (feito) |
| `library:index` | `GET library/index` | — | `{ total, errors: [{ file, message }] }` | 6a (feito) |

Filtros de `library:documents:list` (iguais aos parâmetros de query de hoje, mas `category` e `tags` já são listas): `q` busca em título, nome do arquivo, tags, categorias e conteúdo; `category` é o caminho por nível (documentos dentro dele); `tags` exige todas; `has` é uma lista com `infographic` e/ou `mind-map` e só deixa as páginas que têm **tudo** o que foi pedido gerado (o infográfico e/ou o mapa mental); `type` (`summary`, `transcription`, `article`), `source` (`video`, `manual`), `status` (padrão `published`; também `archived`, `pending`) e `sort` (`title` padrão, ou `recent`). Valor fora dessas listas → `VALIDATION`; documento inexistente → `NOT_FOUND`. Não há paginação (o back devolve a lista inteira). Cada resumo da lista traz `hasInfographic` e `hasMindMap` (só quando são verdade; o infográfico guardado antes das seções não conta), usados para as marcas na tela de Páginas.

Erros da escrita: `category` e `tags` que não são lista de textos → `VALIDATION` com "O campo "category" deve ser uma lista de textos." (validação no `LibraryHandler`, como o controller fazia); título ou conteúdo vazio, documento já publicado, editar o que não está publicado e descartar publicado → `VALIDATION` com a mensagem do service; id inexistente → `NOT_FOUND`; falha da IA em `suggest` → `PROVIDER_FAILED` ("Não foi possível obter a sugestão da IA. Tente novamente." ou "A IA não retornou uma sugestão válida..."); `suggest` sem chave do Gemini → `NOT_CONFIGURED`. `mind-map:generate` em página que não é resumo → `VALIDATION`; falha da IA → `PROVIDER_FAILED` com o motivo em português do provedor (limite de uso, chave recusada, sem conexão…) ou "A IA não retornou um mapa mental válido. Tente novamente."; página inexistente → `NOT_FOUND`. `mind-map:save` em página que não é resumo, ramos que não são uma lista ou mapa sem nenhum ramo com texto → `VALIDATION`. `infographic:generate` em página que não é resumo ou com modelo (`layout`) desconhecido → `VALIDATION`; falha da IA → `PROVIDER_FAILED` com o motivo em português do provedor ou "A IA não retornou um infográfico válido. Tente novamente."; página inexistente → `NOT_FOUND`. O PNG do infográfico usa o canal `mind-map:save-image`. `mind-map:save-image` com nome ou conteúdo que não são textos, conteúdo que não é um PNG ou maior que 40 MB → `VALIDATION`; falha ao gravar o arquivo → `PERSIST_FAILED`.

A pasta da biblioteca não gera `NOT_CONFIGURED`: ela é obrigatória nas Configurações (com padrão em Documentos/HomeLab) e o back trata pasta inexistente como vazia.
| `library:reindex` | `POST library/reindex` | — | `{ indexed, errors }` | 6b (feito) |
| `library:documents:create-article` | `POST library/documents/article` | `{ title, category, tags?, content }` | documento (`{ meta, content }`), já publicado | 6b (feito) |
| `library:documents:publish` | `POST library/documents/:id/publish` | `{ id, title?, category, tags? }` | documento; move o arquivo da entrada (ou de arquivado) para a pasta da categoria | 6b (feito) |
| `library:documents:update` | `PATCH library/documents/:id` | `{ id, title?, category?, tags?, content? }` (só o informado muda) | documento; renomeia/move o arquivo se título ou categoria mudarem | 6b (feito) |
| `library:documents:suggest` | `POST library/documents/:id/suggest` | `{ id, modelId? }` | `{ title, category, tags, model }` (sem `modelId`, usa o modelo mais barato) | 6b (feito) |
| `library:mind-map:get` | (novo, sem equivalente HTTP) | `{ id }` | `{ subtitle?, nodes, model, createdAt, stale, edited } \| null` (`nodes`: `{ label, note?, children }`; `null` = ainda não gerado; `stale` = o resumo mudou depois) | mapa mental e infográfico |
| `library:mind-map:generate` | (novo, sem equivalente HTTP) | `{ id, modelId? }` | `{ subtitle?, nodes, model, createdAt, stale, edited }` (gera de novo se já havia; sem `modelId`, o modelo mais barato) | mapa mental |
| `library:mind-map:save` | (novo, sem equivalente HTTP) | `{ id, subtitle?, nodes }` (`nodes`: `{ label, note?, children }`) | `{ subtitle?, nodes, model, createdAt, stale, edited }` (o mapa como foi guardado, com `edited: true`) | mapa mental |
| `prompts:list`, `prompts:save`, `prompts:delete`, `prompts:activate` | (novos, sem equivalente HTTP) | ver `prompts.md` | a visão completa dos prompts (padrão, versões e versão em uso) | prompts |
| `library:infographic:get` | (novo, sem equivalente HTTP) | `{ id }` | `{ kicker?, title, subtitle?, intro?, piece, sections, takeaways?, model, createdAt, stale } \| null` (`sections`: `{ layout, title, subtitle?, piece, sides?, items, tips?, note?, meterLabel? }`; `items`: `{ piece, title, text, tag?, extra?, value?, winner? }`; `null` = ainda não gerado; `stale` = o resumo mudou depois) | infográfico |
| `library:infographic:generate` | (novo, sem equivalente HTTP) | `{ id, modelId?, layout? }` (`layout`: um dos 10 modelos, para um infográfico de uma seção só; sem ele a IA conta a história inteira) | o infográfico (gera de novo se já havia; sem `modelId`, o modelo mais barato) | infográfico |
| `library:infographic:save` | (novo, sem equivalente HTTP) | `{ id, infographic }` (o infográfico sem `model`, `createdAt`, `stale` e `edited`: capa, seções e fechamento) | o infográfico guardado, com `edited: true` e sem aviso de desatualizado. Passa pela mesma limpeza da resposta da IA (textos cortados, modelos e peças conferidos, peça vazia preenchida); só para resumos (`VALIDATION` se não for); sem título ou sem seção válida → `VALIDATION`. `infographic` que não é um objeto com a lista `sections` → `VALIDATION`. |
| `library:infographic:delete` | (novo, sem equivalente HTTP) | `{ id }` | nada (apaga **só o infográfico** da página; o resumo e o mapa mental ficam; página sem infográfico não é erro, página inexistente é `NOT_FOUND`) |
| `library:mind-map:save-image` | (novo, sem equivalente HTTP) | `{ fileName, dataBase64, format? }` (arquivo em base64, sem o prefixo `data:`; `format`: `png` (padrão), `svg` ou `pdf`) | `{ saved, path? }` (`saved: false` = o usuário fechou o diálogo "Salvar como") | mapa mental |
| `library:mind-map:delete` | (novo, sem equivalente HTTP) | `{ id }` | nada (apaga **só o mapa mental** da página, com as edições; o resumo e o infográfico ficam; página sem mapa não é erro, página inexistente é `NOT_FOUND`) |
| `library:documents:archive` | `POST library/documents/:id/archive` | `{ id }` | documento com `status: archived` (o arquivo continua na pasta) | 6b (feito) |
| `library:documents:delete` | `DELETE library/documents/:id` | `{ id }` | nada (só pendente ou arquivado; publicado → `VALIDATION`) | 6b (feito) |

## livros (fases 7a e 7b)
| Canal | Substitui | Payload | Retorno | Fase |
|---|---|---|---|---|
| `library:books:list` | `GET library/books` | `{ documentId? }` | resumos dos livros (capa, progresso, `moduleCount`; com `documentId`, cada um traz `containsDocument`) | 7a (feito) |
| `library:books:get` | `GET library/books/:id` | `{ id }` | livro com módulos e capítulos (`available` é `false` se o documento saiu da biblioteca) e `readDocumentIds` | 7a (feito) |
| `library:books:read` | `GET library/books/:id/read` | `{ id }` | livro + conteúdo dos capítulos disponíveis (os indisponíveis ficam de fora) | 7a (feito) |
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
| `jobs:create-pdf-to-summary` | — | `{ token, providerId, modelId, thinking?, detail?, title?, category?, tags? }` | `{ id, status }` (status `pending`). O `token` vem de `pdf:inspect`; o texto vai para o disco antes de o job existir (ver `leitura-de-pdf.md`). Token expirado ou dica inválida → `VALIDATION` e nenhum job é criado |
| `jobs:create-video-to-summary` | `POST jobs/video-to-summary` | `{ url, providerId, modelId, thinking?, detail?, title?, category?, tags? }` | `{ id, status }` (status `pending`) |

Criar um job valida **antes** de enfileirar (título de texto com até 120 caracteres; `category` e `tags` listas de textos; categoria de 1 a 4 níveis; ver `regras/back/jobs.md`): se algo for inválido responde `VALIDATION` com a mensagem de hoje e **nenhum job é criado**. `detail` desconhecido não é erro: vale `detailed` (regra do back). O job entra na fila e responde na hora; os jobs rodam **um por vez**, na ordem de chegada. Falha do pipeline (download, ffmpeg, Whisper, IA) **não** é erro do canal: o job termina `failed` com a mensagem em `error` (ex.: "Modelo Whisper não encontrado: ..."), e a fila segue. O acompanhamento é por consulta (`jobs:list`, a cada 1 s no front).

### jobs: excluir (persistência)
| Canal | Payload | Retorno |
|---|---|---|
| `jobs:delete` | `{ ids }` | `{ deleted, skipped: [{ id, reason: ACTIVE|NOT_FOUND }] }` (job na fila ou rodando nunca é excluído) |
| `jobs:delete-all` | — | o mesmo; exclui tudo que terminou e informa o que ficou por estar ativo |

Excluir um job não apaga os documentos que ele gerou.

### jobs: cancelar, tentar de novo e desfazer exclusão
| Canal | Payload | Retorno |
|---|---|---|
| `jobs:cancel` | `{ id }` | `{ id, outcome: 'cancelled' \| 'cancelling' \| 'not-active' }`. Na fila: sai dela e termina como falha "Cancelado pelo usuário.". Rodando: o job é **interrompido na hora**: download, ffmpeg, Whisper e a chamada à IA são cortados (ver `persistencia.md`), e o job termina como falha "Cancelado pelo usuário." e libera a fila para o próximo. Cancelar não gera aviso de falha. |
| `jobs:retry` | `{ id, providerId?, modelId?, thinking? }` | `{ id, status }` do **mesmo** job, que volta à fila e continua da etapa que parou (as etapas concluídas não são refeitas; ver `persistencia.md`). Só job `failed` que guardou os dados de criação (`request`); job antigo sem `request` responde `VALIDATION` com mensagem clara. Num **resumo de PDF** os campos de modelo trocam o modelo do job novo (o trabalho continua de onde parou, só as partes que faltam usam o modelo novo); nos outros tipos eles são ignorados. |
| `jobs:leftovers` | — | `{ files, bytes }`: o que processos não terminados (falhos, cancelados ou interrompidos) deixaram no disco: progresso de resumos de PDF e vídeos e áudios temporários. Não apaga nada. |
| `jobs:clean-leftovers` | — | `{ files, bytes, failed }`: apaga esses arquivos; `failed` conta o que estava em uso e não pôde ser apagado. **Nunca apaga o que um job na fila ou rodando usa**, nem os documentos gerados (inbox e biblioteca). |
| `jobs:undo-delete` | — | `{ restored: string[] }`. Traz de volta o que a **última** exclusão tirou (guardado só em memória, enquanto o app está aberto). |

`JobView` ganhou `cancelRequested` e `retryable`. O `Job` grava `request` (corpo original da criação) no `jobs.json`.

### jobs: acesso a vídeos que exigem login
| Canal | Payload | Retorno |
|---|---|---|
| `jobs:grant-access` | `{ id }` | `{ id, granted }`. Abre a janela de login do site do vídeo (o job precisa ter falhado com `errorCode: 'ACCESS_REQUIRED'`, senão `VALIDATION`) e **só responde quando o usuário a fecha**. `granted` é `true` se o app tem cookies desse site. A tela então chama `jobs:retry`. |
| `platform:forget-logins` | – | `{ removed }`. Apaga os logins guardados dos sites de vídeo (cofre cifrado e sessão aberta); `removed` é quantos cookies saíram (0 = não havia). Botão em Configurações > Acessos. |

`JobView` ganhou `errorCode` (`'ACCESS_REQUIRED'`) e `accessUrl`. Detalhes em `download-de-videos.md`.

## backup
| Canal | Payload | Retorno |
|---|---|---|
| `backup:preview` | — | `{ items: [{ id, kind: files|records, count, bytes, estimatedZipBytes }], notIncluded }` |
| `backup:create` | `{ items }` | `{ cancelled, path?, bytes?, files? }`; o main abre o diálogo de salvar; progresso em `backup:progress` |
| `backup:cancel` | — | nada; cancela o backup ou a restauração (o zip parcial é apagado) |
| `backup:inspect` | — | `{ token, fileName, createdAt, appVersion, items }` ou `null` se o usuário cancelar; o main abre o diálogo de abrir |
| `backup:restore` | `{ token, items, mode: merge|replace }` | `{ items: [{ id, added, skipped }], safetyCopyPath, restartRequired }` |

Itens: `library` (páginas e livros), `inbox`, `jobs`, `chats`, `usage`, `settings`. O renderer **nunca envia caminhos**: o zip escolhido é identificado por um token. Zip inválido, de versão futura, com arquivo desconhecido ou item ausente → `VALIDATION`; falha de disco → `PERSIST_FAILED`.

## pdf (criar página a partir de um PDF; ver `leitura-de-pdf.md`)
| Canal | Payload | Retorno |
|---|---|---|
| `pdf:inspect` | — | `{ token, fileName, sizeBytes, pageCount, emptyPages, characters, estimatedTokens, parts, estimatedCalls, warnings }` ou `null` se o usuário cancelar; o main abre o diálogo (só `.pdf`) e lê o texto, com progresso em `pdf:progress` |
| `pdf:cancel` | — | nada; interrompe a leitura entre duas páginas (`pdf:inspect` responde `null`) |

O renderer **nunca envia caminho**: o PDF lido é identificado por um token e o texto fica na memória do main. Problemas do arquivo (não é PDF, passa de 50 MB ou 1500 páginas, protegido por senha, corrompido, sem texto, já há uma leitura em andamento) → `VALIDATION` com a mensagem pronta para o usuário.

## avisos
| Canal | Payload | Retorno |
|---|---|---|
| `notices:pending` | — | avisos nascidos durante a abertura (entregues uma vez só) |
| `components:status` | — | lista de componentes, hardware, progresso e `needsSetup` (ver `componentes.md`) |
| `components:install` | `{ ids }` | baixa e instala; progresso no evento `components:progress` |
| `components:cancel` | — | cancela a instalação em andamento |
| `components:remove` | `{ id }` | remove modelo ou pacote CUDA |
| `components:set-active-model` | `{ id }` | escolhe o modelo do Whisper em uso |
| `app:settings-section` | — | seção pedida ao abrir as Configurações (uma vez só) |

## Eventos (main → renderer)
Enviados com `webContents.send` a todas as janelas; a ponte (`window.api.on(evento, ouvinte)`) só entrega os de `IpcEvents` e só o payload.

| Evento | Payload | Quando |
|---|---|---|
| `backup:progress` | `{ phase: preparing|running|verifying|done, processed, total, currentFile? }` | criar e restaurar backup |
| `pdf:progress` | o mesmo (`processed` e `total` em páginas) | ler o texto de um PDF |
| `library-move:progress` | o mesmo | mover a biblioteca |
| `app:notice` | `{ id, level: info|warning|error, title, message?, detail?, link? }` | job terminou ou falhou, falha ao gravar em disco (aviso com `link` para a tela em que o usuário já está não é mostrado: dentro de Em andamento, o resultado já está no job) |

## Regras
- Um endpoint HTTP = um canal. `:id` e query viram campos do payload.
- Erros HTTP de hoje: 404 → `NOT_FOUND`, 400 → `VALIDATION`, 502 → `PROVIDER_FAILED` (falha de serviço externo, como a IA), demais → `INTERNAL`. Um erro que traz um `IpcError` `NOT_CONFIGURED` na `cause` (ex.: sugestão de IA sem chave) responde `NOT_CONFIGURED`.
- Antes de implementar cada grupo, confira o controller e o DTO atual e registre aqui o payload exato.
