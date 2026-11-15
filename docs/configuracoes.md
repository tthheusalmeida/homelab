# Configurações (substitui o `.env`)

## Princípios
- O app abre **sem nenhuma configuração prévia**: pastas e Ollama têm padrões; só a chave do Gemini é necessária para usar o Gemini, e sem ela o provider responde `NOT_CONFIGURED` com mensagem em português.
- Nenhum caminho, URL ou chave fixos no código. Tudo vem do `SettingsStore` e do `SecretStore`.
- **Não existe mais `.env`:** a importação única do `.env` do back (que existia só em desenvolvimento) acabou na fase 09a. Na primeira execução o usuário informa pastas e chave pela janela de Configurações, que abre sozinha.
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
- Executável do Whisper: só o nome do arquivo, sem pastas. **Modelo:** o nome do arquivo (procurado na pasta do Whisper) **ou um caminho completo**, em qualquer pasta.
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

## Como o back recebe esses valores (desde a fase 09a)
- O back (`src/back`) recebe a configuração por uma `BackConfig` tipada (`libraryDir`, `inboxDir`, `videoTempDir`, `audioTempDir`, `ollamaUrl`, `geminiApiKey`), implementada pelo `SettingsBackConfig`: pastas e URL vêm do `settings.json` a cada leitura e a chave do Gemini, dos segredos, lida uma vez na inicialização. Os services a leem **na criação**, por isso mudar configuração exige reiniciar (exceto o Whisper, que lê a cada transcrição).
- Sem chave do Gemini o `GeminiProvider` responde `NOT_CONFIGURED`; o `WhisperService` do back é a porta abstrata que o `DesktopWhisperService` implementa; `PORT` e `CORS_ORIGIN` deixaram de existir (não há HTTP).

### Como era nas fases 03 a 08 (histórico)
- `DesktopAppConfig` implementa o `AppConfig` do back e responde cada chave (`LIB_DIR`, `OLLAMA_URL`…) com o valor do Settings. Chave desconhecida lança erro.
- O `NestHost` do desktop monta o Nest com os módulos do back, sem `ConfigModule` e sem validação de `.env`.
- `GeminiProvider` é trocado nos metadados dos módulos que o declaram (`AIModule`, `VideoModule`) por uma fábrica: com chave, cria o provider real; sem chave, usa um provider que responde `NOT_CONFIGURED`.
- `WhisperService` é trocado no `AIModule` (o único que o declara) pelo `DesktopWhisperService`, que lê o Settings e usa o resolvedor.
- ffmpeg segue sendo chamado pelo PATH pelo `VideoService` (continua só testável).

## Providers
### Externos (`providers:external:*`)
- Hoje: Gemini. Novas fontes entram registrando outra definição (`ExternalProviderDefinition`).
- `list`, `get` (estado e chave mascarada), `save` (chave não vazia), `test` (chave candidata ou a salva; mesma checagem do health: `models.list`).
- O teste devolve `{ ok, message }`; falhas nunca viram exceção. A mensagem do Gemini é extraída do JSON da SDK.

### Locais (`providers:local:*`)
- Whisper: pasta, executável e modelo (nome ou caminho completo). O teste verifica a existência do executável e do modelo, com a mesma regra que a transcrição usa.
- Ollama: URL. Teste faz `GET /api/tags` (5 s de limite).
- ffmpeg: somente teste (`ffmpeg -version`). O back o chama pelo PATH; configurá-lo exigiria alterar o back.
- Novos entram registrando outra definição (`LocalProviderDefinition`).

## Binários por plataforma
- Pasta `resources/bin/<platform>-<arch>/`; hoje só `win32-x64` (`whisper-cli.exe` e DLLs de CUDA).
- `resources/bin/README.md` explica como posicionar os arquivos. Os binários não entram no git.
- **Resolvedor (`WhisperBinaryResolver`, fase 08):** junta pasta + executável e confere se existe. Existe: usa (mesmo numa plataforma sem binário embutido, se o usuário apontou o dele). Não existe e a plataforma não é `win32-x64` → `UNSUPPORTED_PLATFORM` ("O Whisper embutido ainda não está disponível para <plataforma>..."). Não existe em `win32-x64` → `NOT_CONFIGURED` ("Whisper CLI não encontrado: <caminho>..."). Modelo ausente → `NOT_CONFIGURED` ("Modelo Whisper não encontrado: <caminho>..."). Quem transcreve é o `DesktopWhisperService`, que o `main/whisper-provider.ts` coloca no lugar do `WhisperService` do back (mesmo mecanismo do Gemini, sem editar o back). Os argumentos do Whisper, a limpeza do `.txt` e a mensagem "Falha ao transcrever o áudio." são os mesmos de antes.
- No job, o erro de configuração aparece como mensagem do job (o job guarda só o texto), e o job seguinte da fila roda normalmente.
- **Exceção ao "reiniciar":** o Whisper lê pasta, executável e modelo a cada transcrição, então valem no próximo job; a janela de Configurações continua avisando que reiniciar é necessário porque o aviso vale para todos os serviços locais.
- O modelo `ggml-large-v3-turbo.bin` (~1,5 GB) não vai no instalador.
