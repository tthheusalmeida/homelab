# Empacotamento (Windows)

O instalador é gerado pelo `electron-builder` (config em `electron-builder.yml`). Só Windows x64, NSIS, **sem assinatura de código** (o SmartScreen avisa) e sem auto-update. Linux e macOS ficam para depois.

## Comandos
- `npm run icons`: gera `build/icon.png` e `build/icon.ico` (16 a 256 px) a partir de `build/icon.svg` (ícone escolhido: colmeia, fundo circular).
- `npm run dist:dir`: build + app desempacotado em `release/win-unpacked` (rápido; serve para testar).
- `npm run dist`: build + instalador `release/HomeLab-Setup-<versão>.exe`.
- `npx playwright test e2e/packaged.spec.ts`: abre o `HomeLab.exe` desempacotado (usuário novo) e confere o Whisper embutido. É pulado se `release/win-unpacked` não existir.

## O que entra
- `dist/` (main e preload), `dist-renderer/` (as duas janelas) e `package.json`, dentro do `app.asar`. As dependências do renderer (React, Vite, Tailwind…) são `devDependencies` e **não** entram: só as do main (`@google/genai`, Nest, axios, rxjs, uuidv7, yaml…).
- `resources/bin/win32-x64/` vai para `<instalação>\resources\bin\win32-x64` (`extraResources`, **fora do asar**, porque é executado). Contém `whisper-cli.exe` e as DLLs (ggml, CUDA 12). O **modelo `.bin` não entra**: o usuário informa em Configurações. Como obter os binários: `resources/bin/README.md`.
- `resources/bin` não é versionado. Antes de `npm run dist`, ele precisa estar preenchido.

## Caminhos
- `resolveResourcesDir` (`src/main/paths.ts`): empacotado usa `process.resourcesPath`; em desenvolvimento, `resources/` do projeto. O padrão do Whisper em Configurações é `<resources>/bin/<plataforma>-<arch>`.
- Dados do usuário (`userData`): `%APPDATA%\homelab-desktop` (nome do `package.json`), igual em dev e instalado. `HOMELAB_USER_DATA_DIR` troca a pasta. Bibliotecas e jobs ficam nas pastas escolhidas em Configurações (padrão em Documentos\HomeLab).
- Desinstalar **não apaga** `userData` nem os dados do usuário (`deleteAppDataOnUninstall: false`).

## Identidade
`appId: homelab`, nome `HomeLab`, instalador por usuário (sem administrador), com escolha da pasta de instalação.

## Tamanho
O instalador é grande por causa das DLLs de CUDA (`ggml-cuda`, `cublasLt`, `cublas`, ~1,1 GB sem compressão). Se for um problema, a saída é oferecer uma versão só com CPU.
