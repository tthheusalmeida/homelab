# Empacotamento (Windows)

O instalador é gerado pelo `electron-builder` (config em `electron-builder.yml`). Só Windows x64, NSIS, **sem assinatura de código** (o SmartScreen avisa) e sem auto-update. Linux e macOS ficam para depois.

## Comandos
- `npm run icons`: gera `build/icon.png` e `build/icon.ico` (16 a 256 px) a partir de `build/icon.svg` (ícone escolhido: colmeia, fundo circular).
- `npm run dist:dir`: build + app desempacotado em `release/win-unpacked` (rápido; serve para testar).
- `npm run dist:win` (e `npm run dist`): build + instalador `release/HomeLab-Setup-<versão>.exe`.
- `npm run dist:linux` (AppImage, **nada embutido**: ffmpeg e yt-dlp são baixados pelo app para `userData/bin/linux-x64`) e `npm run dist:mac` (configuração pronta, ainda sem binários). Cada um é gerado no **próprio sistema** (o macOS só empacota num Mac); a saída prática é uma matriz do GitHub Actions (windows-latest, ubuntu-latest, macos-latest).
- `npx playwright test e2e/packaged.spec.ts`: abre o `HomeLab.exe` desempacotado (usuário novo) e confere o Whisper embutido. É pulado se `release/win-unpacked` não existir.

## O que entra
- `dist/` (main e preload), `dist-renderer/` (as duas janelas) e `package.json`, dentro do `app.asar`. As dependências do renderer (React, Vite, Tailwind…) são `devDependencies` e **não** entram: só as do main (`@google/genai`, Nest, axios, rxjs, uuidv7, yaml…).
- `resources/bin/<plataforma>-<arch>/` vai para `<instalação>
esourcesin<plataforma>-<arch>` (`extraResources` dentro de `win:`, `linux:` e `mac:`, **fora do asar**, porque é executado): cada instalador leva só os binários do seu sistema. No Windows entram `whisper-cli.exe`, as DLLs de CPU e o `ffmpeg.exe`. **Não entram** os modelos (`*.bin`) nem o pacote CUDA (`cublas*`, `cudart*`, `nvblas*`, `nvrtc*`, `ggml-cuda.dll`): o instalador NSIS não passa de ~2 GB, então o assistente de instalação do app baixa esses itens depois. Como obter os binários: `resources/bin/README.md`.
- **ffmpeg:** o app usa o embutido (`resolveFfmpegPath`, `src/providers/ffmpeg-binary-resolver.ts`) e, se ele não existir (desenvolvimento), o `ffmpeg` do PATH.
- `resources/bin` não é versionado. Antes de `npm run dist`, ele precisa estar preenchido.

## Caminhos
- `resolveResourcesDir` (`src/main/paths.ts`): empacotado usa `process.resourcesPath`; em desenvolvimento, `resources/` do projeto. O padrão do Whisper em Configurações é `<resources>/bin/<plataforma>-<arch>`.
- Dados do usuário (`userData`): `%APPDATA%\homelab-desktop` (nome do `package.json`), igual em dev e instalado. `HOMELAB_USER_DATA_DIR` troca a pasta. Bibliotecas e jobs ficam nas pastas escolhidas em Configurações (padrão em Documentos\HomeLab).
- Desinstalar **não apaga** `userData` nem os dados do usuário (`deleteAppDataOnUninstall: false`).

## Identidade
`appId: homelab`, nome `HomeLab`, instalador por usuário (sem administrador), com escolha da pasta de instalação.

## Tamanho
O instalador fica pequeno de propósito (app + Whisper em CPU + ffmpeg). Os itens grandes (modelos do Whisper e o pacote CUDA, ~1 GB) são baixados pelo app. Até o assistente de instalação existir, um instalador novo não traz modelo: o job de vídeo avisa "Modelo Whisper não encontrado".
