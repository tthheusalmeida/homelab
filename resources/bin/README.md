# Binários nativos por plataforma

Esta pasta não é versionada (exceto este README). Cada plataforma tem a sua subpasta:

```
resources/bin/
  win32-x64/    whisper-cli.exe + DLLs (ggml*.dll, whisper.dll, cublas/cudart de CUDA 12…) + ffmpeg.exe
  linux-x64/    (futuro)
  darwin-arm64/ (futuro)
```

- O Whisper usa sempre os padrões do app (não há campos para isso nas Configurações): a pasta é `resources/bin/<plataforma>`, o executável é `whisper-cli.exe` (`whisper-cli` fora do Windows) e o modelo é `ggml-large-v3-turbo.bin`.
- Windows (x64): copie para `win32-x64/` **todo** o conteúdo da pasta do Whisper (`whisper-cli.exe`, as DLLs **e o modelo `ggml-large-v3-turbo.bin`**, ~1,5 GB). O modelo fica junto dos binários, na mesma pasta.
- Sem o executável ou sem o modelo nessa pasta, o job de vídeo falha com a mensagem "Whisper CLI não encontrado" ou "Modelo Whisper não encontrado", já com o caminho completo esperado. Em Configurações > Serviços locais o botão **Testar** do Whisper mostra o mesmo.
- Plataformas sem subpasta (tudo que não é `win32-x64`) resultam em `UNSUPPORTED_PLATFORM`.
- Quem escolhe o executável é o `WhisperBinaryResolver` (`src/providers/whisper-binary-resolver.ts`).

- **ffmpeg:** coloque o `ffmpeg.exe` (build "essentials" de https://www.gyan.dev/ffmpeg/builds/) em `win32-x64/`, com a licença. Sem ele o app usa o `ffmpeg` do PATH.
- Na geração do instalador, `*.bin` e as DLLs de CUDA são excluídos (ver `electron-builder.yml`); mantê-los nesta pasta serve só para desenvolvimento.

Ver `docs/configuracoes.md`.
