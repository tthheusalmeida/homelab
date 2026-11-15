# Configurações (substitui o `.env`)

## Princípios
- O app abre **sem nenhuma configuração prévia**: pastas e Ollama têm padrões; só a chave do Gemini é necessária para usar o Gemini, e sem ela o provider responde `NOT_CONFIGURED` com mensagem em português.
- Nenhum caminho, URL ou chave fixos no código. Tudo vem do `SettingsStore` e do `SecretStore`.
- O `.env` do back **não é mais lido pelo desktop**, exceto por uma importação única na primeira execução em desenvolvimento (para não redigitar tudo). Some na fase 09.
- **Mudar configuração exige reiniciar o app**: os services do back leem tudo uma vez, ao serem criados. Toda gravação responde `restartRequired` e o canal `app:relaunch` reinicia.

## Janela de Configurações
- Abre pelo item **Configurações** no rodapé da barra lateral, por `Ctrl+,`/`Cmd+,` e sozinha na primeira execução sem chave do Gemini.
- Seções: **Pastas** (com seletor de pasta do sistema), **IAs externas** (chave mascarada, Testar/Salvar) e **Serviços locais** (Whisper, Ollama e ffmpeg, só teste).
- Cada provider é um item **recolhível**: fechado mostra nome, selo de status e uma descrição; clicar abre os campos.
- "Salvo" aparece como **snackbar** no canto inferior direito (some em 3 s). Mostra "Reiniciar agora" quando uma gravação exige reinício. Código em `renderer/settings`.

## Armazenamento (`app.getPath('userData')`, ex.: `%APPDATA%\homelab-desktop`)
- `settings.json`: pastas e providers locais. Escrita atômica; valores ausentes recebem o padrão; arquivo ilegível vai para `settings.json.corrupt`.
- `secrets.json`: chaves de API **cifradas** com `safeStorage` (DPAPI no Windows, Keychain no macOS, libsecret no Linux), pela API **assíncrona** (`encryptStringAsync`/`decryptStringAsync`; a síncrona está obsoleta). Se o sistema trocar a chave de criptografia (`shouldReEncrypt`), o segredo é regravado. Sem criptografia disponível, o app recusa salvar. Segredo que não decifra conta como não configurado.
- O renderer **nunca** recebe a chave: só `configured` e a versão mascarada (`••••••••` + 4 últimos caracteres).
- `HOMELAB_USER_DATA_DIR` aponta o `userData` para outra pasta (testes e desenvolvimento).

## Padrões (primeira execução)
| Item | Padrão |
|---|---|
| Biblioteca | `Documentos/HomeLab/library` |
| Entrada | `Documentos/HomeLab/inbox` |
| Temporários | `Documentos/HomeLab/temp/video` e `.../temp/audio` |
| Whisper | `resources/bin/<platform>-<arch>`, executável `whisper-cli(.exe)`, modelo `ggml-large-v3-turbo.bin` |
| Ollama | `http://localhost:11434` |

## Validação (ao salvar)
- Pastas e pasta do Whisper: não vazias e **caminho absoluto**.
- Executável e modelo do Whisper: só o nome do arquivo, sem pastas (o back junta pasta e nome).
- URL do Ollama: http ou https válida.
- Erros voltam como `VALIDATION`, com mensagem em português, e nada é gravado.

## De onde vem cada variável de hoje
| Variável atual | Novo lugar |
|---|---|
| `GEMINI_API_KEY` | `SecretStore` (`gemini.apiKey`), provider externo `gemini` |
| `OLLAMA_URL` | `settings.local.ollama.url`, provider local `ollama` |
| `WHISPER_DIR`, `WHISPER_EXECUTABLE`, `WHISPER_MODEL` | `settings.local.whisper` (`directory`, `executable`, `model`), provider local `whisper` |
| `LIB_DIR` | `settings.paths.libraryDir` |
| `TEMP_DOCS_DIR` | `settings.paths.inboxDir` |
| `TEMP_VIDEO_DIR`, `TEMP_AUDIO_DIR` | `settings.paths.videoTempDir`, `settings.paths.audioTempDir` |
| `PORT`, `CORS_ORIGIN` | Somem na fase 09 (sem HTTP). Até lá `CORS_ORIGIN` vem da origem do front carregado |
| ffmpeg no PATH | Só testável (provider local `ffmpeg`, `editable: false`) |

## Como o back recebe esses valores (sem editá-lo)
- `DesktopAppConfig` implementa o `AppConfig` do back e responde cada chave (`LIB_DIR`, `OLLAMA_URL`…) com o valor do Settings. Chave desconhecida lança erro.
- O `NestHost` do desktop monta o Nest com os módulos do back, sem `ConfigModule` e sem validação de `.env`.
- `GeminiProvider` é trocado nos metadados dos módulos que o declaram (`AIModule`, `VideoModule`) por uma fábrica: com chave, cria o provider real; sem chave, usa um provider que responde `NOT_CONFIGURED`.

## Providers
### Externos (`providers:external:*`)
- Hoje: Gemini. Novas fontes entram registrando outra definição (`ExternalProviderDefinition`).
- `list`, `get` (estado e chave mascarada), `save` (chave não vazia), `test` (chave candidata ou a salva; mesma checagem do health: `models.list`).
- O teste devolve `{ ok, message }`; falhas nunca viram exceção. A mensagem do Gemini é extraída do JSON da SDK.

### Locais (`providers:local:*`)
- Whisper: pasta, executável e modelo. Teste verifica a existência do executável e do modelo.
- Ollama: URL. Teste faz `GET /api/tags` (5 s de limite).
- ffmpeg: somente teste (`ffmpeg -version`). O back o chama pelo PATH; configurá-lo exigiria alterar o back.
- Novos entram registrando outra definição (`LocalProviderDefinition`).

## Binários por plataforma
- Pasta `resources/bin/<platform>-<arch>/`; hoje só `win32-x64` (`whisper-cli.exe` e DLLs de CUDA).
- `resources/bin/README.md` explica como posicionar os arquivos. Os binários não entram no git.
- O resolvedor de binário por plataforma, com `UNSUPPORTED_PLATFORM` e o caminho livre do modelo, chega na fase 08.
- O modelo `ggml-large-v3-turbo.bin` (~1,5 GB) não vai no instalador.
