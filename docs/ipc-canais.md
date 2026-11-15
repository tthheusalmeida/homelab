# Canais IPC (inventário)

Origem: os 37 endpoints HTTP atuais (`/api/v1`) + os canais novos de app, settings e providers. Convenção: `<domínio>:<ação>`; payload e retorno seguem o DTO/rota atual (ver `back/doc/`). Todos respondem `IpcResult<T>` (ver `arquitetura.md`). Status de cada grupo em `migracao.md`.

## app (fase 2)
| Canal | Retorno |
|---|---|
| `app:ping` | `"pong"` |
| `app:version` | versão do app |

## settings e providers (fase 3, novos)
| Canal | Para quê |
|---|---|
| `settings:get` / `settings:update` | Pastas (biblioteca, entrada, temporários) |
| `providers:external:list` / `get` / `save` / `test` | IAs externas (Gemini…): chave mascarada, salvar, testar conexão |
| `providers:local:list` / `get` / `save` / `test` | Locais (Whisper, Ollama, ffmpeg): caminho/URL, salvar, testar, detectar |

## health (fase 4)
| Canal | Substitui |
|---|---|
| `health:system` | `GET health/system` |
| `health:ai` | `GET health/ai` |

## ai (fase 4)
| Canal | Substitui | Payload |
|---|---|---|
| `ai:providers` | `GET ai/providers` | — |
| `ai:models` | `GET ai/providers/:providerId/models` | `{ providerId }` |
| `ai:thinking` | `GET ai/thinking` | `{ providerId, modelId }` |
| `ai:usage` | `GET ai/usage` | `{ provider? }` |

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
