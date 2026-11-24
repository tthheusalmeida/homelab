# Configurações (substitui o `.env`)

## Princípios
- O app abre **sem nenhuma configuração prévia** e tem **pouquíssimas opções**: só a **pasta da biblioteca** (páginas e livros), a aparência, a chave do Gemini e o endereço do Ollama são do usuário. Todo o resto (entrada, temporários, dados do app, Whisper) é padrão fixo, para reduzir atrito. Pastas e Ollama têm padrões; só a chave do Gemini é necessária para usar o Gemini, e sem ela o provider responde `NOT_CONFIGURED` com mensagem em português.
- Nenhum caminho, URL ou chave fixos no código. Tudo vem do `SettingsStore` e do `SecretStore`.
- **Não existe mais `.env`:** a importação única do `.env` do back (que existia só em desenvolvimento) acabou na fase 09a. Na primeira execução o usuário informa pastas e chave pela janela de Configurações, que abre sozinha.
- **Mudar configuração exige reiniciar o app**: os services do back leem tudo uma vez, ao serem criados. Toda gravação responde `restartRequired`, a tela de Configurações marca o reinício como pendente no main e o canal `app:relaunch` reinicia.

## Tela de Configurações
- É uma **rota do app** (`/settings`, sem janela separada): abre pelo item **Configurações** no rodapé da barra lateral (fica marcado enquanto a rota está ativa), por `Ctrl+,`/`Cmd+,` e sozinha, em IAs externas, na primeira execução sem chave do Gemini. `?section=<id>` abre numa seção (ex.: `components`).
- Seções: **IA padrão** (qual IA faz a sugestão de título, o mapa mental e o infográfico; ver `ia-padrao.md`), **Biblioteca** (a única pasta que o usuário escolhe; trocar pergunta se a biblioteca atual vai junto), **Aparência** (tema, cor de destaque e **Leitura**: fonte, tamanho da letra, zoom (letra e largura) e cores com intensidade, com preview; mais a seção **Transcrição**, irmã da Leitura, com os ajustes só desse tipo; vale na hora, sem reiniciar; ver `identidade.md`), **Infográfico** (galeria dos modelos e dos ícones que a IA usa, ver `infografico.md`), **IAs externas** (passo a passo para criar a chave enquanto não configurada, chave mascarada, Testar/Salvar, link para o consumo real no painel do provedor) e **Serviços locais** (Whisper e ffmpeg só testam; o Ollama tem o endereço) **Backup** (criar e restaurar; ver `persistencia.md`), **Sobre** (versão instalada, verificar agora, `updates.autoCheck` e a versão nova; ver `atualizacoes.md`) e **Atualizações** (versão instalada, verificar, baixar e aplicar a versão nova; ver `atualizacoes.md`).
- Cada provider é um item **recolhível**: fechado mostra nome, selo de status e uma descrição; clicar abre os campos.
- Em **IAs externas**, cada serviço mostra o seu **logo** (`ProviderLogo`, em `components`) e a descrição diz a empresa: "Google · Gemini é a família de modelos de IA do Google", "Anthropic · Claude é a família de modelos de IA da Anthropic". O título do cartão é o **nome da empresa** (Google, Anthropic); o modelo (Gemini, Claude) fica na descrição. As imagens são PNGs de 128 px em `renderer/src/assets/providers` (origem e licença no README da pasta: ícones do LobeHub, MIT; as marcas seguem sendo das empresas e a Anthropic pede aprovação prévia para usar o logo dela). Serviço novo sem imagem mostra a inicial do nome.
- "Salvo" aparece como **snackbar** no canto inferior direito (some em 3 s, com barra de progresso). Quando uma gravação exige reinício, o aviso "Reiniciar agora" aparece no rodapé da tela **e fica fixado na barra lateral do app** (cartão "Reinício pendente" com o botão, acima de Configurações; dentro das Configurações o cartão se esconde para não repetir o aviso), mesmo depois de sair delas. O estado vive no main (`RestartState`, canais `app:restart-pending` e `app:mark-restart-pending`, evento `app:restart-needed`), então sobrevive a sair e voltar das Configurações e zera ao reiniciar. Código em `renderer/settings` e `SidebarRestartNotice`.

## Armazenamento
Tudo o que é do usuário mora numa **raiz fixa**, `Documentos/HomeLab` (`HOMELAB_DATA_ROOT_DIR` troca a raiz em testes e desenvolvimento), segmentada por tipo, para o backup ser simples:

```
Documentos/HomeLab/
├─ library/        páginas e livros (único caminho que o usuário pode trocar)
├─ inbox/          documentos pendentes dos jobs
├─ data/           jobs.json, chats.json, ai-usage.json
├─ config/         settings.json
└─ temp/           vídeo e áudio temporários e áreas de restauração (nunca entram no backup)
```

- `settings.json` (em `config/`): só a pasta da biblioteca, a aparência, o endereço do Ollama e `support.starPromptHidden` (convite da estrela, `apoio.md`), `updates.autoCheck` (verificação automática de atualizações, padrão ligada). Escrita atômica com cópia `.bak` da última versão boa; valores ausentes recebem o padrão; valores antigos de pastas e do Whisper que sobrarem no arquivo são ignorados. Arquivo ilegível: usa o `.bak` (e avisa); sem `.bak`, vai para `.corrupt` e o app segue com os padrões.
- `prompts.json` (em `config/`): os prompts de IA que o usuário personalizou, em versões nomeadas (ver `prompts.md`).
- `jobs.json`, `chats.json` e `ai-usage.json` (em `data/`): ver `persistencia.md`.
- `secrets.json` fica em `app.getPath('userData')` (ex.: `%APPDATA%\homelab-desktop`), **fora da raiz e fora do backup**: chaves de API **cifradas** com `safeStorage` (DPAPI no Windows, Keychain no macOS, libsecret no Linux), pela API **assíncrona**. Se o sistema trocar a chave de criptografia (`shouldReEncrypt`), o segredo é regravado. Sem criptografia disponível, o app recusa salvar. Segredo que não decifra conta como não configurado.
- O renderer **nunca** recebe a chave: só `configured` e a versão mascarada (`••••••••` + 4 últimos caracteres).
- `HOMELAB_USER_DATA_DIR` aponta o `userData` para outra pasta (testes e desenvolvimento).
- **Migração do formato antigo:** na primeira abertura depois da mudança, se existe o `settings.json` antigo em `userData`, o app mostra uma janela perguntando se **move** os dados para a raiz nova, **mantém** a biblioteca onde está ou deixa para depois. Nada é apagado: os arquivos antigos viram `.migrated` e as pastas antigas continuam intactas até o usuário removê-las (`src/main/legacy-migration.ts`; sai do código depois).

## Padrões (primeira execução)
| Item | Padrão |
|---|---|
| Biblioteca | `Documentos/HomeLab/library` (única pasta escolhida pelo usuário) |
| Entrada | `Documentos/HomeLab/inbox` (fixa) |
| Temporários | `Documentos/HomeLab/temp/video` e `.../temp/audio` (fixos) |
| Whisper | `resources/bin/<platform>-<arch>`, executável `whisper-cli(.exe)`, modelo `ggml-large-v3-turbo.bin` **na mesma pasta** (fixos; só dá para testar) |
| Ollama | `http://localhost:11434` |
| Aparência | tema `system` (acompanha o Windows), cor de destaque `cyan` (a do ícone) e leitura: fonte padrão, letra 16, zoom 100% e cores do tema (intensidades 50 e 900 ao escolher uma cor) |

### Trocar a pasta da biblioteca
Ao salvar um caminho novo o app olha a pasta: **vazia ou nova** oferece "Mover a biblioteca atual para cá" (copia páginas e livros com progresso, confere, troca, reindexa e pede reinício; apagar a pasta antiga é uma caixa desmarcada) ou "Começar vazia"; pasta que **já tem arquivos** só oferece "Usar esta pasta" (a atual fica onde está). Falha no meio não troca nada (`LibraryMover`).

## Validação (ao salvar)
- Pasta da biblioteca: não vazia e **caminho absoluto**.
- URL do Ollama: http ou https válida.
- Tema e cor de destaque: um dos valores conhecidos.
- Erros voltam como `VALIDATION`, com mensagem em português, e nada é gravado.

## De onde vem cada variável de hoje
| Variável atual | Novo lugar |
|---|---|
| `GEMINI_API_KEY` | `SecretStore` (`gemini.apiKey`), provider externo `gemini` |
| `OLLAMA_URL` | `settings.local.ollama.url`, provider local `ollama` |
| `WHISPER_DIR`, `WHISPER_EXECUTABLE`, `WHISPER_MODEL` | Padrão fixo do app (`resources/bin/<plataforma>`), provider local `whisper` (só teste) |
| `LIB_DIR` | `settings.paths.libraryDir` |
| `TEMP_DOCS_DIR` | Fixa: `<raiz>/inbox` |
| `TEMP_VIDEO_DIR`, `TEMP_AUDIO_DIR` | Fixas: `<raiz>/temp/video` e `<raiz>/temp/audio` |
| `PORT`, `CORS_ORIGIN` | Somem na fase 09 (sem HTTP). Até lá `CORS_ORIGIN` vem da origem do front carregado |
| ffmpeg embutido (`resources/bin`) ou no PATH | Só testável (provider local `ffmpeg`, `editable: false`) |

## Como o back recebe esses valores (desde a fase 09a)
- O back (`src/back`) recebe a configuração por uma `BackConfig` tipada (`libraryDir`, `inboxDir`, `videoTempDir`, `audioTempDir`, `ollamaUrl`, `geminiApiKey`), implementada pelo `SettingsBackConfig`: pastas e URL vêm do `settings.json` a cada leitura e a chave do Gemini, dos segredos, lida uma vez na inicialização. Os services a leem **na criação**, por isso mudar configuração exige reiniciar (exceto o Whisper, que lê a cada transcrição).
- Sem chave do Gemini o `GeminiProvider` responde `NOT_CONFIGURED`; o `WhisperService` do back é a porta abstrata que o `DesktopWhisperService` implementa; `PORT` e `CORS_ORIGIN` deixaram de existir (não há HTTP).

### Como era nas fases 03 a 08 (histórico)
- `DesktopAppConfig` implementa o `AppConfig` do back e responde cada chave (`LIB_DIR`, `OLLAMA_URL`…) com o valor do Settings. Chave desconhecida lança erro.
- O `NestHost` do desktop monta o Nest com os módulos do back, sem `ConfigModule` e sem validação de `.env`.
- `GeminiProvider` é trocado nos metadados dos módulos que o declaram (`AIModule`, `VideoModule`) por uma fábrica: com chave, cria o provider real; sem chave, usa um provider que responde `NOT_CONFIGURED`.
- `WhisperService` é trocado no `AIModule` (o único que o declara) pelo `DesktopWhisperService`, que lê o Settings e usa o resolvedor.
- O `VideoService` chama o ffmpeg embutido em `resources/bin/<plataforma>-<arch>` (`BackConfig.ffmpegPath`, via `resolveFfmpegPath`) e, sem ele, o do PATH; continua só testável.

## Providers
### Externos (`providers:external:*`)
- Hoje: **Gemini** e **Anthropic** (Claude). Novas fontes entram por registro, em cinco passos (ver `adicionar-provider.md`). A chave da Anthropic fica no `SecretStore` (`anthropic.apiKey`), chega ao back por `BackConfig.anthropicApiKey` (lida uma vez, na inicialização; reiniciar para valer) e o teste faz `models.list`. Sem chave, o provider responde `NOT_CONFIGURED`, como o Gemini.
- `list`, `get` (estado e chave mascarada), `save` (chave não vazia), `test` (chave candidata ou a salva; mesma checagem do health: `models.list`).
- O teste devolve `{ ok, message }`; falhas nunca viram exceção. A mensagem do Gemini é extraída do JSON da SDK.
- **Peças comuns aos providers de IA na nuvem** (`src/back/modules/ai/providers/shared`; Gemini e Anthropic só fornecem o que é da SDK deles, um novo provider faz o mesmo):
  - `ModelCatalog`: modelos cadastrados, preço (inclusive por faixa de prompt), custo estimado, ordem por custo e o mais barato.
  - `classifyByStatus`: erro HTTP em passageiro ou não, com as mensagens de cada provider.
  - `runResilientChat` (recebe um `ChatBackend`): confere a chave, repete em erro passageiro, troca uma vez para o modelo mais barato e registra o consumo.
  - No app (`src/providers`): `createApiKeyDefinition` monta a definição do provider externo que só precisa de chave.
- **Modelos do Gemini:** só os de texto cadastrados em `gemini.pricing.ts` (com o preço da faixa padrão) aparecem, **ordenados do mais barato ao mais caro** (entrada + saída por milhão de tokens). Para incluir um modelo novo, cadastre o ID e o preço lá.
- **Modelos da Anthropic:** só os abertos a qualquer chave de API e com preço conhecido (`anthropic.pricing.ts`): Fable 5, 5.1 e 5.2; Opus 4.5 a 4.8, 5 e 5.5; Sonnet 4.5, 4.6, 5 e 5.5; Haiku 4.5 e 5.5. Ficam de fora os de acesso restrito a organizações verificadas (Mythos) e os aposentados (Opus 4.1, Opus 4, Sonnet 4). A lista vem da API (`models.list`) cruzada com a tabela de preços, **ordenada do mais barato ao mais caro**; um ID com sufixo de data (`...-20251001`) casa com o ID sem data. O Haiku 5.5 tem duas faixas de preço (prompt até 100 mil tokens e acima disso) e o custo estimado usa a faixa certa. O app não liga o raciocínio estendido nem manda `temperature`: cada modelo roda no comportamento padrão; a resposta vem em stream (teto de 32 mil tokens). Resposta em JSON é pedida por instrução no `system`.
- **Seletor "Pensar":** o chat e os formulários de resumo mostram, ao lado de provedor e modelo, o seletor **Pensar** (antes "Thinking") só quando o modelo escolhido oferece essa opção. Modelos sem ela (os da Anthropic) não mostram o seletor e a escolha não é exigida: o botão de criar fica habilitado e o pedido segue sem `thinking`.
- **Erros da Anthropic:** 429 (limite de uso) e 5xx/529 (sobrecarregada) e falhas de rede repetem até 3 vezes (espera de 3 s e 8 s); 401/403 (chave), 404 (modelo), 400/413 (pedido) e recusa de conteúdo (`stop_reason: refusal`) não repetem. Depois das 3 tentativas, troca **uma vez** para o modelo mais barato da Anthropic, como no Gemini.
- **Troca automática para o mais barato:** se o modelo escolhido continua indisponível (sobrecarga, limite de uso ou rede) depois das 3 tentativas, o app tenta **uma vez** o modelo mais barato (com as mesmas 3 tentativas). O job mostra "Trocando para o modelo mais barato: <motivo>", e o Consumo registra o modelo que de fato respondeu. Não troca se o erro não é passageiro (chave recusada, pedido recusado), se o usuário cancelou ou se o escolhido já é o mais barato.

### Locais (`providers:local:*`)
- Whisper: **só teste** (os valores são fixos: pasta `resources/bin/<plataforma>`, executável e modelo `ggml-large-v3-turbo.bin` na mesma pasta). O teste verifica a existência do executável e do modelo, com a mesma regra que a transcrição usa, e as mensagens mandam instalar a transcrição ou um modelo em Configurações > Componentes, sem citar ferramenta nem caminho.
- Ollama: URL. Teste faz `GET /api/tags` (5 s de limite).
- ffmpeg ("Processamento de áudio"): somente teste (`ffmpeg -version`). O app usa o embutido ou o instalado pelo assistente e, sem eles, o do PATH; não há campo para trocá-lo. O caminho é resolvido **a cada uso** (`BackConfig.ffmpegPath()`), então instalar o ffmpeg pelo assistente vale sem reiniciar.
- Novos entram registrando outra definição (`LocalProviderDefinition`).

## Binários por plataforma
- Windows instalado: `<userData>/bin/win32-x64/` (preenchida a cada abertura com o que veio no instalador em `resources/bin/win32-x64`: `whisper-cli.exe`, `ffmpeg.exe` e DLLs de CPU; CUDA é baixada pelo assistente). Em desenvolvimento: `resources/bin/win32-x64/`. Linux: `<userData>/bin/linux-x64/`, preenchida pelo assistente (ffmpeg e yt-dlp). Ver `componentes.md`.
- `resources/bin/README.md` explica como posicionar os arquivos. Os binários não entram no git.
- **Resolvedor (`WhisperBinaryResolver`, fase 08):** junta pasta + executável e confere se existe. Existe: usa (mesmo numa plataforma sem binário embutido, se o usuário apontou o dele). Não existe e o catálogo não tem a transcrição para o sistema → `UNSUPPORTED_PLATFORM` ("A transcrição ainda não está disponível neste sistema operacional.", sem nome de sistema nem de ferramenta). Não existe num sistema que tem → `NOT_CONFIGURED` ("Whisper CLI não encontrado: <caminho>..."). Modelo ausente → `NOT_CONFIGURED` ("Modelo Whisper não encontrado: <caminho>..."). Quem transcreve é o `DesktopWhisperService`, que o `main/whisper-provider.ts` coloca no lugar do `WhisperService` do back (mesmo mecanismo do Gemini, sem editar o back). Os argumentos do Whisper, a limpeza do `.txt` e a mensagem "Falha ao transcrever o áudio." são os mesmos de antes.
- No job, o erro de configuração aparece como mensagem do job (o job guarda só o texto), e o job seguinte da fila roda normalmente.
- **Exceção ao "reiniciar":** o Whisper lê pasta, executável e modelo a cada transcrição, então valem no próximo job; a tela de Configurações continua avisando que reiniciar é necessário porque o aviso vale para todos os serviços locais.
- O modelo `ggml-large-v3-turbo.bin` (~1,5 GB) fica **na mesma pasta dos binários** (`resources/bin/<plataforma>`); copie-o para lá. Não vai no git e, se não couber no instalador, a distribuição precisará de outra forma de entrega.
