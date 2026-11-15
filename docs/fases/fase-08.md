# Fase 08 — Jobs e resolvedor do Whisper

Status: pendente

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
