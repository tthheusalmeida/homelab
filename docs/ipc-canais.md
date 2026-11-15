# Canais IPC (inventário)

Origem: os 37 endpoints HTTP atuais (`/api/v1`) + os canais novos de app, settings e providers. Convenção: `<domínio>:<ação>`; payload e retorno seguem o DTO/rota atual (ver `back/doc/`). Todos respondem `IpcResult<T>` (ver `arquitetura.md`). Status de cada grupo em `migracao.md`.

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

## chat (fase 5)
| Canal | Substitui | Payload |
|---|---|---|
| `chat:send` | `POST chat` | `{ message, modelId, providerId, thinking? }` |

## library (fases 6a e 6b)
| Canal | Substitui | Fase |
|---|---|---|
| `library:documents:list` | `GET library/documents` (filtros e busca na query) | 6a |
| `library:documents:get` | `GET library/documents/:id` | 6a |
| `library:inbox` | `GET library/inbox` | 6a |
| `library:categories` | `GET library/categories` | 6a |
| `library:tags` | `GET library/tags` | 6a |
| `library:index` | `GET library/index` | 6a |
| `library:reindex` | `POST library/reindex` | 6b |
| `library:documents:create-article` | `POST library/documents/article` | 6b |
| `library:documents:publish` | `POST library/documents/:id/publish` | 6b |
| `library:documents:update` | `PATCH library/documents/:id` | 6b |
| `library:documents:suggest` | `POST library/documents/:id/suggest` | 6b |
| `library:documents:archive` | `POST library/documents/:id/archive` | 6b |
| `library:documents:delete` | `DELETE library/documents/:id` | 6b |

## livros (fases 7a e 7b)
| Canal | Substitui | Fase |
|---|---|---|
| `library:books:list` | `GET library/books` | 7a |
| `library:books:get` | `GET library/books/:id` | 7a |
| `library:books:read` | `GET library/books/:id/read` | 7a |
| `library:books:search` | `GET library/books/:id/search` | 7a |
| `library:books:create` | `POST library/books` | 7b |
| `library:books:update` | `PATCH library/books/:id` | 7b |
| `library:books:delete` | `DELETE library/books/:id` | 7b |
| `library:books:set-structure` | `PUT library/books/:id/structure` | 7b |
| `library:books:add-chapter` | `POST library/books/:id/chapters` | 7b |
| `library:books:mark-chapter-read` | `PUT library/books/:id/chapters/:documentId/read` | 7b |
| `library:books:reset-progress` | `DELETE library/books/:id/progress` | 7b |
| `library:books:set-position` | `PUT library/books/:id/position` | 7b |

## jobs (fase 8)
| Canal | Substitui |
|---|---|
| `jobs:list` | `GET jobs` |
| `jobs:types` | `GET jobs/types` |
| `jobs:get` | `GET jobs/:id` |
| `jobs:create-video-to-transcript` | `POST jobs/video-to-transcript` |
| `jobs:create-video-to-summary` | `POST jobs/video-to-summary` |

## Regras
- Um endpoint HTTP = um canal. `:id` e query viram campos do payload.
- Erros HTTP de hoje: 404 → `NOT_FOUND`, 400 → `VALIDATION`, demais → `INTERNAL`.
- Antes de implementar cada grupo, confira o controller e o DTO atual e registre aqui o payload exato.
