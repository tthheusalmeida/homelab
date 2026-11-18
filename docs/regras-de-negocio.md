# Regras de negócio (não mudam na migração)

A migração só troca o transporte (HTTP → IPC) e a origem da configuração (`.env` → Settings). As regras abaixo continuam valendo. Desde a fase 09c elas vivem aqui, em `docs/regras/` (copiadas dos repositórios antigos `back/doc` e `front/doc`, que não têm mais manutenção). Leia só o arquivo da área que a tarefa toca.

## Back (`docs/regras/back/`, código em `src/back`)
| Arquivo | Assunto |
|---|---|
| `ai.md` | Providers (Ollama/Gemini), modelos, thinking, custo, usage |
| `chat-health.md` | Chat e health checks |
| `jobs.md` | Job, ciclo de vida, etapas, fila, pipelines, título/categoria/tags |
| `video.md` | Download, ffmpeg, Whisper, resumo, temporários |
| `library.md` | Documentos `.md`, frontmatter, nomes, categorias, ciclo pending/published/archived, livros |
| `testing.md` | Convenções de teste do back |

O antigo `env.md` (variáveis de ambiente) **não foi copiado**: foi substituído por `configuracoes.md` (Settings e segredos).

## Front (`docs/regras/front/`, código em `renderer/src`)
| Arquivo | Assunto |
|---|---|
| `home.md` | Home: status dos serviços, cards, relógio |
| `chat.md` | Chat com IA |
| `usage.md` | Uso de IA |
| `jobs.md` | Criar e acompanhar jobs |
| `library.md` | Biblioteca, documento, edição, livros, classificação (rota `inbox`), novo artigo |
| `components.md` | Reuso de componentes base |
| `lib.md` | Cliente IPC, formatadores, query client |
| `testing.md` | Convenções de teste do front |

## Onde as cópias já divergem do original
- Textos que falam de rotas HTTP (`/library/*`, `/jobs`…) descrevem a regra; hoje o transporte é um canal IPC com o mesmo nome de ação (ver `ipc-canais.md`).
- `lib.md`: `api()` com `fetch` virou `ipc.invoke`. `home.md`: o health é por canal IPC e o card não tem mais link.
- Convenções de teste: valem as de `CLAUDE.md` e `testing.md` (`when ..., should ...`, Vitest no renderer, Jest no main).

## Quando mudar uma regra
Atualize o doc de `docs/regras/` **e** registre a mudança na doc da fase.
