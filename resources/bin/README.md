# Binários nativos por plataforma

Esta pasta não é versionada (exceto este README). Cada plataforma tem a sua subpasta:

```
resources/bin/
  win32-x64/    whisper-cli.exe + DLLs (ggml*.dll, whisper.dll, cublas/cudart de CUDA 12…)
  linux-x64/    (futuro)
  darwin-arm64/ (futuro)
```

- Windows (x64): copie para `win32-x64/` o conteúdo da pasta atual do Whisper (`D:\homelab\ai\whisper`), **sem** o modelo `.bin`.
- O modelo (`ggml-large-v3-turbo.bin`, ~1,5 GB) não fica aqui: o caminho é configurado em Providers locais.
- Plataformas sem subpasta resultam em `UNSUPPORTED_PLATFORM`.

Ver `docs/configuracoes.md`.
