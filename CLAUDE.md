# CLAUDE.md — Desktop (homelab-desktop)

App desktop (Windows primeiro; depois Linux e macOS) do HomeLab: **Electron + React + IPC**. É a raiz do projeto Electron: o front fala com o back por **IPC** (não há HTTP). A migração do front + back para o desktop está **concluída**; o projeto evolui com funcionalidades novas, sempre pelo fluxo de `docs/versionamento.md`.

- **Back:** os services do Nest 11 vivem em `src/back` (copiados do antigo `back/`). Nest é só contêiner de injeção de dependência (`createApplicationContext`): sem HTTP, sem controllers, sem `.env`, sem porta. Os handlers IPC substituíram os controllers.
- **Front:** o renderer é o próprio front em `renderer/src` (mesma estrutura de pastas: `pages/<rota>`, `components`, `ui`, `lib`, `hooks`, `app`), com IPC nos `api.ts`, sem overrides e sem `fetch`.
- `desktop/` (este repo): `main`, `preload`, `shared` (contratos IPC), `back`, handlers, settings e empacotamento.

**Independência:** o desktop **não lê mais `../back` nem `../front`**; os dois são repositórios antigos, sem manutenção. **Não os edite nem commite neles.** Mudanças de código vão só em `desktop/`.

Estado: app instalável e em uso (versão `0.1.x`). Falta o que está em `docs/migracao.md` (fases 11 a 13: validação de commits, release automatizado, atualização no app).

## Como consultar
**Leia `docs/` antes de abrir código.** Cada arquivo descreve em frases uma área. Abra só o que a tarefa pede; para trabalhar numa fase pendente, leia apenas `docs/fases/fase-XX.md` dela (fase concluída tem o arquivo apagado).

| Arquivo | Assunto |
|---|---|
| `docs/migracao.md` | Decisões da migração (concluída), fases pendentes (11 a 13), regra de entrega e pendências |
| `docs/versionamento.md` | **SemVer, Conventional Commits, branch + merge request e validação** (regra obrigatória) |
| `docs/arquitetura.md` | Processos, estrutura de pastas, Nest como DI, padrão dos handlers (classes/SOLID), envelope de resultado, preload e segurança |
| `docs/ipc-canais.md` | Inventário dos 37 endpoints HTTP → canais IPC (nomes e payloads) |
| `docs/configuracoes.md` | Settings (substitui `.env`), providers externos e locais, segredos, binários por plataforma |
| `docs/testing.md` | Convenções de teste, mocks, checklist manual e smoke E2E |
| `docs/identidade.md` | Identidade Colmeia: tema claro/escuro/sistema, cor de destaque configurável, componentes hexagonais |
| `docs/componentes.md` | Catálogo de componentes (Whisper, ffmpeg, CUDA, modelos), download com checksum, recomendação por hardware e assistente de instalação |
| `docs/download-de-videos.md` | Download de YouTube e outras plataformas com yt-dlp, aviso ao usuário e login por janela do app (cookies temporários) |
| `docs/atalhos.md` | Paleta de comandos (Ctrl K), atalhos "G e uma letra" e notificação do sistema quando um job termina |
| `docs/movimento.md` | Transições e animações: réguas de tempo, utilities `animate-*`, onde aplicar |
| `docs/empacotamento.md` | Instalador Windows (`electron-builder`), binários, caminhos empacotados, ícone |
| `docs/persistencia.md` | Jobs e chats em disco, pasta-raiz única para backup, exclusão de jobs, seção de Chats |
| `docs/regras-de-negocio.md` | Onde ficam as regras que **não mudam** (`docs/regras/back`, `docs/regras/front`) |
| `docs/fases/fase-11.md` … `fase-13.md` | Plano das fases pendentes: escopo, testes e checklist (apagar o arquivo ao concluir) |

Regras de negócio (biblioteca, jobs, IA, vídeo) estão documentadas em `docs/regras/back/` e `docs/regras/front/` (ver `docs/regras-de-negocio.md`). Leia a regra antes de mexer em `src/back`.

## Comandos
- `npm run dev` — compila o main e sobe: Vite do app principal (5173), Vite das Configurações (5174) e o Electron
- `npm start` — build completo (renderer e main) e abre o app com os arquivos estáticos (`dist-renderer`)
- `npm run build` / `build:renderer` (`:main`, `:settings`) / `build:main`
- `npm test` (Jest, `src/**/*.spec.ts`, inclui os testes de `src/back`) / `npm run test:watch` / `npm run test:cov`
- `npm run test:renderer` (Vitest, `renderer/**/*.test.{ts,tsx}`) / `npm run typecheck:renderer`
- `npm run test:e2e` — smoke E2E com Playwright (build + app real com `userData` temporário)
- `npm run dist:dir` / `npm run dist` — app desempacotado / instalador Windows (ver `docs/empacotamento.md`); `npm run icons` gera o `.ico`
- `npm run lint` / `npm run format`

## Mapa do código (alvo; criado ao longo das fases)
- `src/main/` — `index.ts` (bootstrap), `content-security-policy.ts`, `first-run.ts`, `local-state-guard.ts`, `shortcuts.ts`, `single-window.ts`, `constants.ts`, `paths.ts`, `front-target.ts`, `window-options.ts`, `navigation-guard.ts`, `static-files.ts` (protocolo `app://`), `back-container.ts` (Nest como contêiner de DI), `back-services.ts` (instâncias do back para os handlers), `composition.ts`, `electron-cipher.ts`
- `src/back/` — o back dentro do desktop: `back.module.ts` (`BackModule.forRoot`), `config/back-config.ts` (`BackConfig`), `modules/{ai,chat,health,jobs,library,video}` (services, domínio, providers; testes ao lado), `utils/`, `testing/` (helper de biblioteca temporária)
- `src/storage/` — `json-file.ts` (JSON atômico com `.bak`) e `tree.ts` (cópia conferida de pastas, escaneamento, progresso)
- `src/backup/` — backup e restauração em `.zip` (`zip.ts`, `manifest.ts`, `backup.service.ts`)
- `src/preload/` — `bridge.ts` (ponte com lista de canais permitidos) e `index.ts` (`contextBridge` expõe `window.api`); empacotado com esbuild
- `renderer/` — UI do desktop, **fora do `src/`**: `src/` (o front: `app`, `pages/<rota>`, `components`, `ui`, `lib` com `ipc.ts`, `hooks`, `test` com `api-mock.ts`), `settings/` (janela de Configurações), `index.html`, `public`, `vite-aliases.mts`, `tsconfig.json`
- `vite.renderer.main.config.mts`, `vite.renderer.settings.config.mts`, `vitest.renderer.config.mts`, `tsconfig.renderer.json` — build, testes e tipos do renderer (dependências próprias; instalar com `npm install --legacy-peer-deps`)
- `dist-renderer/` — saída do build do renderer (não versionada)
- `src/shared/` — **contratos usados por main, preload e front**: `channels.ts` (`IpcChannels`), `errors.ts` (`IpcErrorCode`, `IpcError`), `result.ts` (`IpcResult`), `contracts/` (request/response por canal), `renderer-api.ts`, `ipc-client.ts` (cliente do front)
- `src/ipc/` — `IpcHandler` (base, `routes()`), `IpcRegistrar`, `IpcErrorMapper`, `IpcMainLike`, `handlers/*.handler.ts` + `handlers/index.ts` (`createHandlers`), `testing/FakeIpcMain`
- `src/settings/` — `app-paths.ts` (raiz fixa), `library-mover.ts`, `SettingsStore`, `SecretStore` (`safeStorage`), validador, defaults, `SettingsBackConfig` (a `BackConfig` do back sobre o store e os segredos)
- `src/providers/` — serviços e definições dos providers externos (Gemini) e locais (Whisper, Ollama, ffmpeg)
- `resources/bin/<platform>-<arch>/` — binários nativos (Whisper). Não versionados.
- `e2e/` + `playwright.config.ts` — smoke E2E do Electron real
- `electron-builder.yml`, `build/` (ícone), `scripts/build-icons.mjs` — empacotamento
- `docs/` — documentação

## Convenções
- Textos de interface e mensagens de erro em **português**; código e commits em inglês.
- **Ferramentas internas são transparentes ao usuário:** nenhum texto da interface, mensagem de erro ou resultado de teste cita ffmpeg, Whisper, yt-dlp, CUDA ou nome de modelo; use "Transcrição", "Processamento de áudio", "Download de vídeos" e as opções de qualidade. Só serviços de terceiros configurados pelo usuário (Gemini, Ollama) aparecem pelo nome.
- **Commits em Conventional Commits** (`feat:`, `fix:`, `docs:`, `build:`, `refactor:`, `test:`, `chore:`... em inglês) e versão em **SemVer**; ver a seção abaixo.
- **Handlers IPC são classes** (`extends IpcHandler`), uma por domínio, com dependências injetadas (SOLID, clean code). Detalhes em `docs/arquitetura.md`.
- **Nada repetido em string solta**: nomes de canal, códigos de erro e mensagens ficam em constantes (`shared/channels.ts`, `shared/errors.ts`). Handler e front importam as mesmas constantes.
- **Sem `.env`**: caminhos, URLs e chaves vêm de `SettingsStore`/`SecretStore`, configurados pela tela de Configurações. Não existe mais `.env` nem importação dele. Nenhum caminho fixo no código. Segredos cifrados com `safeStorage`.
- Providers separados: **externos** (Gemini e outras IAs) e **locais** (Whisper, Ollama, ffmpeg). Ver `docs/configuracoes.md`.
- Segurança do renderer: `contextIsolation: true`, `nodeIntegration: false`; o preload expõe só métodos tipados, nunca `ipcRenderer`.
- **Não há HTTP**: o front fala com o main só por `window.api` (IPC) e o back é só contêiner de DI. Ninguém abre porta; a CSP não libera `localhost`.
- Código em `src/back` mantém a estrutura de módulos do back original (Nest com decorators) e imports relativos; o `BackConfig` é a única entrada de configuração dele (nada de `process.env`).
- Imports relativos dentro de `desktop/src` (compilação com `tsc` puro, sem reescrita de alias).
- **Fonte única de UI (OBRIGATÓRIO):** `renderer/src/ui` (primitivos) e `renderer/src/components` (baseComponentes) são a **única fonte** de componentes, nas duas janelas (app e Configurações). **Antes de criar qualquer coisa, procure o que já existe** (`ui/`, `components/`, `docs/identidade.md`, `docs/movimento.md`) e reutilize; se faltar uma variante, estenda o componente existente; se for novo e reaproveitável, crie em `components/` (ou `ui/`) e passe a usar nos lugares. Nada de HTML/Tailwind específico reimplementando o que um componente já faz, e as Configurações recebem as mesmas transições e o mesmo visual do app.
- **UI do desktop (`renderer/`)**: reaproveite os componentes por alias (`#ui/*`, `#components/*`, `#lib/*`, `#hooks/*`, `#shared/*`, `#test/*`); não duplique HTML/Tailwind solto. Componentes por rota ficam em `pages/<rota>/components`; a base própria em `components`, construída sobre `ui`.
- **Cores e marca:** nada de cor de destaque fixa (`cyan-*`, `blue-*`) em componente: ação = `primary`, marca = `brand` (ver `docs/identidade.md`); carregando = `LoadingState`/`HexLoader`, status = `HexDot`. Tema e cor são configuráveis em Configurações > Aparência.
- **Movimento:** o que entra ou sai da tela anima (`animate-enter`, `animate-exit-down`, collapsible); use as utilities e réguas de `docs/movimento.md`, sem keyframes soltos. `prefers-reduced-motion` já é tratado globalmente.
- Os `api.ts` do renderer falam só por `ipc.invoke(IpcChannels.x)`; nada de `fetch`, URL ou `import.meta.env`.
- Arquivos de `renderer/src` vieram do front com CRLF e sem config do prettier; **não** rodar `prettier --write` em pastas, só em arquivos novos.

## Versionamento e fluxo de mudanças (OBRIGATÓRIO)
Detalhes em `docs/versionamento.md`. Vale para toda mudança feita **depois** da adoção do SemVer:
- **Nunca commitar direto na `main`.** Crie uma **branch** a partir da `main` atualizada (`feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>`, `build/<assunto>`, `chore/<assunto>`), faça os commits nela e abra um **merge request** (pull request no GitHub) para a `main`, com o título também em Conventional Commits.
- **Mensagem de commit:** `tipo(escopo opcional)!: descrição em inglês`, um assunto por commit. `feat` sobe o MINOR, `fix` o PATCH, `!` ou `BREAKING CHANGE` quebra compatibilidade (em `0.x` sobe o MINOR).
- **Validação ao subir para o GitHub:** título do MR e commits no padrão, lint, Jest, Vitest e typecheck passando. Hoje é conferida à mão (checklist em `versionamento.md`); a fase 11 automatiza com commitlint, ganchos e CI.
- A versão sai dos commits (`package.json`, tag `v<versão>`, Release); a fase 12 automatiza isso. Não escolher número de versão "no olho".
- Commits e branches só quando o usuário pedir; **push e abertura do MR também só quando ele pedir**.

## Regra de entrega por fase (OBRIGATÓRIO)
- Entregas **faseadas**: uma fase por vez, na ordem de `docs/migracao.md`. **Não comece a fase seguinte sem o "ok" do usuário.**
- Cada fase entrega: código + testes unitários + atualização de `docs/` + checklist manual (`docs/fases/fase-XX.md`).
- Ao terminar, dizer que terminou **e** listar "O que testar" (passos numerados e resultado esperado) do lado do usuário.
- Ao concluir a fase (depois do "ok"): atualize `docs/migracao.md` e **apague o arquivo da fase**; o que ela deixou vira documentação de uso em `docs/`.

## Regras para testes (OBRIGATÓRIO)
- **Toda feature (nova ou alterada) vem com testes unitários na mesma entrega.** Sem teste, não está concluída; cubra caminho feliz, erros e casos de borda.
- Teste ao lado do arquivo (`x.ts` → `x.spec.ts`).
- **Nome de cada teste: `when <situação>, should <resultado>`.**
- Componentes do `renderer/` são testados com Vitest (`npm run test:renderer`), mockando `window.api` (`#test/api-mock`), nome `when ..., should ...`.
- Handlers são testados com `FakeIpcMain` (registrados via `IpcRegistrar`) e service mockado, sem Electron real.
- Não chamar serviços reais (rede, ffmpeg, Whisper, Gemini, Ollama) em testes: use mocks.
- Se uma mudança quebrar um teste, decida se é regressão (corrija o código) ou mudança de regra (atualize teste **e** `docs/`).
- Ao mudar comportamento, atualize o `docs/` correspondente na mesma entrega.
