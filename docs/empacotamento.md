# Empacotamento e release

O instalador é gerado pelo `electron-builder` (config em `electron-builder.yml`). Windows x64 (NSIS), **sem assinatura de código** (o SmartScreen avisa). A atualização dentro do app (baixar o instalador do Release e aplicar) está em `atualizacoes.md`. O Linux (AppImage) sai pela CI; o macOS fica para depois.

## Comandos
- `npm run icons`: gera `build/icon.png` e `build/icon.ico` (16 a 256 px) a partir de `build/icon.svg` (ícone escolhido: colmeia, fundo circular).
- `npm run dist:dir`: build + app desempacotado em `release/win-unpacked` (rápido; serve para testar).
- `npm run dist:win` (e `npm run dist`): build + instalador `release/HomeLab-Setup-<versão>.exe`.
- `npm run dist:linux` (AppImage, **nada embutido**: ffmpeg e yt-dlp são baixados pelo app para `userData/bin/linux-x64`) e `npm run dist:mac` (configuração pronta, ainda sem binários). Cada um é gerado no **próprio sistema** (o macOS só empacota num Mac); na CI, cada um roda no seu runner.
- `npx playwright test e2e/packaged.spec.ts`: abre o `HomeLab.exe` desempacotado (usuário novo) e confere o Whisper embutido. É pulado se `release/win-unpacked` não existir.

## O que entra
- `dist/` (main e preload), `dist-renderer/` (as duas janelas) e `package.json`, dentro do `app.asar`. As dependências do renderer (React, Vite, Tailwind…) são `devDependencies` e **não** entram: só as do main (`@google/genai`, Nest, axios, rxjs, uuidv7, yaml…).
- `resources/bin/<plataforma>-<arch>/` vai para `<instalação>/resources/bin/<plataforma>-<arch>` (`extraResources` dentro de `win:`, `linux:` e `mac:`, **fora do asar**, porque é executado): cada instalador leva só os binários do seu sistema. No Windows entram `whisper-cli.exe`, as DLLs de CPU e o `ffmpeg.exe`. **Não entram** os modelos (`*.bin`) nem o pacote CUDA (`cublas*`, `cudart*`, `nvblas*`, `nvrtc*`, `ggml-cuda.dll`): o instalador NSIS não passa de ~2 GB, então o assistente de instalação do app baixa esses itens depois. Como obter os binários: `resources/bin/README.md`.
- **ffmpeg:** o app usa o embutido (`resolveFfmpegPath`, `src/providers/ffmpeg-binary-resolver.ts`) e, se ele não existir (desenvolvimento), o `ffmpeg` do PATH.
- `resources/bin` não é versionado. Antes de `npm run dist`, ele precisa estar preenchido (a CI baixa o pacote `bin-v1`, ver abaixo).
- O bloco `publish` do `electron-builder.yml` aponta para o repositório dos Releases: gera `latest.yml`/`latest-linux.yml` e os `.blockmap` (lidos pelo atualizador do app, fase 13). Nunca publica sozinho (`--publish never`).

## Caminhos
- `resolveResourcesDir` (`src/main/paths.ts`): empacotado usa `process.resourcesPath`; em desenvolvimento, `resources/` do projeto. O padrão do Whisper em Configurações é `<resources>/bin/<plataforma>-<arch>`.
- Dados do usuário (`userData`): `%APPDATA%\homelab-desktop` (nome do `package.json`), igual em dev e instalado. `HOMELAB_USER_DATA_DIR` troca a pasta. Bibliotecas e jobs ficam nas pastas escolhidas em Configurações (padrão em Documentos\HomeLab).
- Desinstalar **não apaga** `userData` nem os dados do usuário (`deleteAppDataOnUninstall: false`).

## Identidade
`appId: homelab`, nome `HomeLab`, instalador por usuário (sem administrador), com escolha da pasta de instalação.

## Tamanho
O instalador fica pequeno de propósito (app + Whisper em CPU + ffmpeg). Os itens grandes (modelos do Whisper e o pacote CUDA, ~1 GB) são baixados pelo app. Até o assistente de instalação existir, um instalador novo não traz modelo: o job de vídeo avisa "Modelo Whisper não encontrado".

## Release automático (CI)
`.github/workflows/release.yml` roda a cada push na `main`: se houver `feat`, `fix` ou quebra desde a última tag `vX.Y.Z`, calcula a versão (`scripts/release/`), gera o changelog, builda o instalador do Windows e o AppImage do Linux e publica o Release com tudo anexado (`.exe`, `.blockmap`, `latest.yml`, `.AppImage`, `latest-linux.yml`). Os outros tipos de commit esperam o próximo release e entram no changelog dele. Detalhes e roteiro de teste: `fases/fase-12.md`; regra de versão: `versionamento.md`.
- A versão é injetada só no build (`npm version --no-git-tag-version`); nada é commitado de volta na `main`. O changelog fica nas notas do Release.
- **Binários do Windows na CI:** `resources/bin` não é versionado, então o build baixa o pacote `win32-x64.zip` do Release `bin-v1` (`scripts/bin-fetch.mjs`, SHA-256 fixado em `scripts/windows-bin.json`). O zip não leva modelos nem CUDA. Para gerar ou trocar o pacote: `npm run bin:pack` (usa o seu `resources/bin/win32-x64`) e siga o que ele imprime.
- Ver o release que sairia agora: `node scripts/release/plan.mjs`.

## Passos manuais no GitHub (uma vez)
1. **Pacote de binários do Windows:** rode `npm run bin:pack`; depois `gh release create bin-v1 --prerelease --title "Binaries v1" --notes "Binários embutidos no instalador."` e `gh release upload bin-v1 dist-components/win32-x64.zip --clobber`. Preencha `url` (`https://github.com/tthheusalmeida/homelab/releases/download/bin-v1/win32-x64.zip`) e `sha256` em `scripts/windows-bin.json`, num PR `build: pin the windows binaries package`. Sem isso o build do Windows falha de propósito e nenhum release sai.
2. **Settings > Actions > General > Workflow permissions:** "Read and write permissions".
3. **Settings > Branches > regra para `main`:** exigir pull request (0 aprovações), exigir os checks `Commits e título` e `Lint, tipos e testes`, bloquear push direto e force push. **Settings > General > Pull Requests:** liberar só *squash* e/ou *rebase*.
4. Manter o repositório **público** (o app e a CI baixam sem token).
5. Conferir com Actions > release > Run workflow (`dry_run` ligado).
