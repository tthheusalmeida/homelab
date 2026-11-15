# Regras de negócio (não mudam na migração)

Esta migração só troca o transporte (HTTP → IPC) e a origem da configuração (`.env` → Settings). As regras abaixo continuam valendo e ficam documentadas nos repos originais. Leia só o arquivo da área que a tarefa toca.

## Back (`back/doc/`)
| Arquivo | Assunto |
|---|---|
| `ai.md` | Providers (Ollama/Gemini), modelos, thinking, custo, usage |
| `chat-health.md` | Chat e health checks |
| `jobs.md` | Job, ciclo de vida, etapas, fila, pipelines, título/categoria/tags |
| `video.md` | Download, ffmpeg, Whisper, resumo, temporários |
| `library.md` | Documentos `.md`, frontmatter, nomes, categorias, ciclo pending/published/archived, livros |
| `env.md` | Variáveis de ambiente de hoje (referência para `configuracoes.md`) |
| `testing.md` | Convenções de teste do back |

## Front (`front/doc/`)
| Arquivo | Assunto |
|---|---|
| `home.md` | Home: status dos serviços, cards, relógio |
| `chat.md` | Chat com IA |
| `usage.md` | Uso de IA |
| `jobs.md` | Criar e acompanhar jobs |
| `library.md` | Biblioteca, documento, edição, livros, entrada, novo artigo |
| `components.md` | Reuso de componentes base |
| `lib.md` | `api()`, formatadores, query client |
| `testing.md` | Convenções de teste do front |

## Quando a migração muda uma regra
- Se uma fase alterar uma regra documentada (ex.: `lib.md` sobre `api()`, `env.md`, health da Home), atualize o doc original **e** registre a mudança na doc da fase.
- Mudanças esperadas: `front/doc/lib.md` (`api()` → `#lib/ipc`), `back/doc/env.md` (substituído por Settings na fase 9), `front/doc/home.md` (health por IPC).
