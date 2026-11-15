# Binários nativos por plataforma

Esta pasta não é versionada (exceto este README). Cada plataforma tem a sua subpasta:

```
resources/bin/
  win32-x64/    whisper-cli.exe + DLLs (ggml*.dll, whisper.dll, cublas/cudart de CUDA 12…)
  linux-x64/    (futuro)
  darwin-arm64/ (futuro)
```

- Windows (x64): copie para `win32-x64/` o conteúdo da pasta atual do Whisper (`D:\homelab\ai\whisper`), **sem** o modelo `.bin`.
- O modelo (`ggml-large-v3-turbo.bin`, ~1,5 GB) não fica aqui: em Configurações > Serviços locais informe o **nome do arquivo** (se ele estiver na pasta do Whisper) ou o **caminho completo** (em qualquer pasta).
- Se o executável não existir na pasta configurada: plataformas sem subpasta (tudo que não é `win32-x64`) resultam em `UNSUPPORTED_PLATFORM`, e `win32-x64` sem os arquivos resulta em `NOT_CONFIGURED` ("Whisper CLI não encontrado"). A mensagem aparece no job que falhou.
- Quem escolhe o executável é o `WhisperBinaryResolver` (`src/providers/whisper-binary-resolver.ts`).

Ver `docs/configuracoes.md`.
