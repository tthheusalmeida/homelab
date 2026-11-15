# Fase 08 — Jobs e resolvedor do Whisper

Status: concluída

## O que foi feito
- Canais `jobs:list|types|get|create-video-to-transcript|create-video-to-summary` (`shared/contracts/jobs.ts`) e `JobHandler`. A lógica de consulta e de criação ficou em `src/jobs`: `JobCatalog` (devolve o `Job` do back já convertido para JSON, como o HTTP fazia) e `JobLauncher` (valida as dicas **antes** de criar, cria e enfileira no `JobRunner` do back). O `BackServices` os monta com as instâncias do `JobsModule`.
- `WhisperBinaryResolver` + `DesktopWhisperService`, que o `main/whisper-provider.ts` coloca no lugar do `WhisperService` do back (só o `AIModule` o declara). O back não foi editado.
- O modelo do Whisper agora aceita **nome de arquivo ou caminho completo** (validador, teste do provider e tela de Configurações; o rótulo do campo mudou).
- Overrides `jobs-create-api.ts` e `jobs-track-api.ts`; o polling de 1 s fica no hook.
- `resources/bin/README.md`, `configuracoes.md`, `arquitetura.md` e `ipc-canais.md` atualizados.

## Diferenças em relação ao plano (e por quê)
- **`WhisperService` e `VideoService` não foram editados** (regra: não alterar o back). O `WhisperService` é trocado por um serviço do desktop com a mesma interface e os mesmos argumentos. O `VideoService` continua igual: as pastas já vêm do Settings pelo `AppConfig`, e o **ffmpeg segue pelo PATH** (só testável), como decidido na fase 03a.
- **"Pasta ausente → `NOT_CONFIGURED`" não se aplica às pastas de vídeo e áudio:** o back as cria sozinho. O `NOT_CONFIGURED` vale para executável e modelo do Whisper ausentes.
- **`UNSUPPORTED_PLATFORM` só quando o executável não existe:** se o usuário apontou o próprio binário numa plataforma sem binário embutido, ele é usado.
- **`detail` inválido não é `VALIDATION`:** continua valendo `detailed`, como diz `back/doc/jobs.md` (a regra de negócio não muda). Título, categoria e tags inválidos são `VALIDATION`.
- O job guarda só o **texto** do erro, então o código (`NOT_CONFIGURED`, `UNSUPPORTED_PLATFORM`) não aparece no job; a mensagem em português aparece.

## Verificação no Electron real (CDP, dados isolados, Whisper e Gemini de verdade)
- **Transcrição e resumo (Gemini, `brief`)** de um vídeo curto: todas as etapas completaram, os temporários de vídeo e áudio foram apagados e os dois documentos apareceram na Entrada (depois do `reindex`, que o front faz ao entrar na Biblioteca) com título, categoria e tags informados (tags em minúsculas), `status: pending` e URL de origem.
- **Fila:** com dois jobs seguidos, o segundo ficou `pending` enquanto o primeiro rodava; nunca houve dois `running`.
- **Validação:** título de 200 caracteres, categoria e tags que não são lista, categoria com 5 níveis e título que não é texto deram `VALIDATION` e **nenhum job foi criado**.
- **Falhas claras sem travar a fila:** modelo inexistente ("Modelo Whisper não encontrado: <caminho>...") e pasta sem o executável ("Whisper CLI não encontrado: <caminho>..."); logo depois de um job falho, um job com URL inválida rodou e falhou sozinho. Na falha os temporários ficam no disco (regra do back).
- **Rede:** nenhuma requisição HTTP para `/jobs`; `jobs:list` e a tela Jobs > Acompanhar mostram os jobs.
- **Não verificado ao vivo:** resumo com Ollama (está desligado nesta máquina), os níveis `detailed` e `study`, `UNSUPPORTED_PLATFORM` (só por teste unitário; só há Windows aqui), modelo configurado só pelo nome de arquivo (usei caminho completo; o nome é coberto por teste unitário) e os cliques nos formulários de criação.

## Risco observado (fase 03a, não é desta fase)
O `safeStorage` guarda a chave de criptografia no `Local State` da pasta de dados, e o Electron só o grava ~10 s depois do primeiro uso. Num teste, matei o app 4 s depois de salvar a chave do Gemini: o segredo ficou ilegível no reinício e voltou como "não configurado". Numa instalação nova, salvar a chave e clicar logo em "Reiniciar agora" (que usa `app.exit(0)`) pode cair no mesmo caso. Não reproduzi esse fluxo exato; tratado na fase 09c (`LocalStateGuard`; ver `fase-09c.md`).

## Objetivo
Pipelines de vídeo funcionando por IPC, com o Whisper embutido por plataforma (win32-x64).

## Escopo
- `JobHandler`: `jobs:list`, `jobs:types`, `jobs:get`, `jobs:create-video-to-transcript`, `jobs:create-video-to-summary`.
- Validação de `title`, `category`, `tags`, `detail` antes de enfileirar (regras em `back/doc/jobs.md`) → `VALIDATION`.
- `WhisperBinaryResolver`: escolhe o binário em `resources/bin/<platform>-<arch>/`; só `win32-x64` implementado; outras plataformas → `UNSUPPORTED_PLATFORM`.
- `WhisperService` e `VideoService` passam a usar o resolvedor, o caminho do modelo (provider local) e as pastas do `SettingsStore`; ffmpeg pelo provider local.
- `resources/bin/README.md` documenta como posicionar os arquivos.
- Front: `jobs/create/api` e `jobs/track/api` passam a IPC; o polling de 1 s fica como está.

## Testes unitários
- Handler: criação com e sem opcionais, tipo inexistente, dicas inválidas.
- Resolvedor: win32-x64 devolve o caminho certo; outras plataformas e arquitetura lançam `UNSUPPORTED_PLATFORM`; binário ausente → erro claro.
- Services: `execFile` mockado com os novos caminhos; pasta ausente → `NOT_CONFIGURED`.
- Front: criação e acompanhamento mockando `window.api`.

## O que testar
1. Job de transcrição com um vídeo curto: todas as etapas completam e o documento aparece na Entrada.
2. Job de resumo (Gemini e Ollama) nos três níveis de detalhe.
3. Título, categoria e tags opcionais refletidos no documento gerado.
4. Enfileirar dois jobs: rodam um por vez.
5. Sem modelo do Whisper configurado: falha com mensagem clara e sem travar a fila.
6. Acompanhamento em Jobs → Track atualiza a cada segundo.

## Critério de aceite
Os dois pipelines rodam de ponta a ponta por IPC, usando o Whisper embutido, sem `.env` e sem PATH além do ffmpeg.
