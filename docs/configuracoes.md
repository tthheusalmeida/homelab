# Configurações (substitui o `.env`)

## Princípios
- O app sobe **sem nenhuma configuração**. O que depender de algo não configurado falha com `NOT_CONFIGURED` e mensagem em português; o front leva o usuário à tela de Configurações.
- Nenhum caminho, URL ou chave fixos no código. Tudo vem do `SettingsStore`.
- O `.env` do back só é usado durante a migração (importação única no desenvolvimento, para não digitar tudo de novo) e some na fase 9.

## Armazenamento
- `SettingsStore`: JSON em `app.getPath('userData')/settings.json`, com leitura tipada e validação ao salvar.
- Segredos (chaves de API) cifrados com `safeStorage` do Electron. O renderer **nunca** recebe a chave de volta: só uma versão mascarada e o indicador "configurada".
- `AppConfig` mantém a interface atual (`get(key)`) e passa a ler do store, então os services do back quase não mudam.

## De onde vem cada variável de hoje
| Variável atual | Novo lugar |
|---|---|
| `GEMINI_API_KEY` | Provider externo `gemini` (segredo) |
| `OLLAMA_URL` | Provider local `ollama` (URL) |
| `WHISPER_DIR`, `WHISPER_EXECUTABLE` | Resolvedor por plataforma em `resources/bin/<platform>-<arch>/` (não configurável) |
| `WHISPER_MODEL` | Provider local `whisper` (caminho do modelo) |
| `LIB_DIR` | `settings` → pasta da biblioteca (obrigatória; escolhida pelo usuário) |
| `TEMP_DOCS_DIR` | `settings` → pasta de entrada |
| `TEMP_VIDEO_DIR`, `TEMP_AUDIO_DIR` | `settings` → temporários (padrão dentro de `userData/temp`) |
| `PORT`, `CORS_ORIGIN` | Somem na fase 9 (sem HTTP) |
| ffmpeg no PATH | Provider local `ffmpeg` (executável; padrão `ffmpeg`) |

## Providers
### Externos (`providers:external:*`)
- Hoje: Gemini. Estrutura pronta para outras fontes de IA.
- Cada um tem: id, label, chave (segredo), estado (`configured`), teste de conexão (mesma checagem do health: Gemini é `ok` se `models.list` funciona).
- `GeminiProvider` inicializa de forma tardia: sem chave, o app abre e o provider reporta `NOT_CONFIGURED`.

### Locais (`providers:local:*`)
- Whisper: caminho do modelo; o executável vem do binário embutido por plataforma. Teste valida existência do binário e do modelo.
- Ollama: URL; teste é o mesmo do health (`GET /api/tags`).
- ffmpeg: executável; teste roda `ffmpeg -version`.
- Cada um pode ser testado e salvo separadamente.

## Binários por plataforma
- Pasta `resources/bin/<platform>-<arch>/`; hoje só `win32-x64` (`whisper-cli.exe` e DLLs de CUDA).
- `resources/bin/README.md` explica como obter e posicionar os arquivos. Os binários não entram no git.
- Plataforma sem binário → `UNSUPPORTED_PLATFORM` ("Whisper ainda não disponível nesta plataforma").
- O modelo `ggml-large-v3-turbo.bin` (~1,5 GB) não vai no instalador; o usuário aponta o arquivo em Providers locais.
