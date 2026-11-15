# Testes (desktop)

## Camadas
- **Unitários do main** (`src/**/*.spec.ts`): Jest + ts-jest, mesmo padrão do back. Cobrem handlers, registrar, mapper de erro, settings, resolvedor de binário e as funções puras do main.
- **Unitários do front** (`*.test.ts(x)`, Vitest): cobrem os `api.ts` migrados (mockando `window.api`), `#lib/ipc` e a tela de Configurações. Convenções em `front/doc/testing.md`.
- **Checklist manual** por fase (`docs/fases/fase-XX.md`): o que o usuário valida no ambiente real.
- **Smoke E2E** (a partir da fase 9): Playwright para Electron, cobrindo abrir o app, navegar nas telas principais e criar um artigo.

## Regra de entrega
Toda feature (nova ou alterada) vem com testes unitários na mesma entrega. Cubra caminho feliz, erros e casos de borda e rode a suíte completa (main e front) antes de dar a fase como entregue.

## Padrão de nome (obrigatório)
`it('when <situação>, should <resultado>', ...)`. `describe` agrupa por classe/método.

## Testando handlers
- O handler recebe `IpcMainLike` por injeção. Nos testes, use um falso que guarda os listeners por canal e permite chamá-los: `await fake.invoke(canal, payload)`.
- O service é mockado. Verifique: o service foi chamado com o payload certo, o retorno vem em `{ ok: true, data }`, e cada exceção relevante vira o `IpcErrorCode` esperado.
- Todo canal declarado em `IpcChannels` precisa ter handler registrado (teste de cobertura de canais), e os canais são únicos e no formato `<domínio>:<ação>`.

## Código do main testável
- Lógica fica em funções/classes **sem import de `electron`** (ex.: `navigation-guard`, `static-files`, `BackendLauncher`), com dependências injetadas (`fetchFn`, `sleep`, `exists`, `chdir`, `load`). Só `main/index.ts` importa o Electron e faz a cola.
- Cuidado conhecido: no Node, `new URL('app://front/x').origin` vale `"null"` (esquema não padrão). Compare `protocolo//host`.

## O que é mockado
- Rede/IA: Gemini (`@google/genai`) e Ollama (`HttpService`).
- Binários: `child_process.execFile` (ffmpeg, Whisper); `fs` onde necessário.
- Electron: `ipcMain`, `app`, `safeStorage` e `BrowserWindow` atrás de interfaces/wrappers; nenhum teste unitário abre janela.
- Arquivos: pasta temporária do SO, removida ao final.
- Front: `window.api` (nunca o Electron real), hooks de dados quando a tela exige.

## Rodar
- `npm test` (tudo), `npx jest caminho/arquivo.spec.ts` (um), `npm run test:watch`, `npm run test:cov`.
- Jest + ts-jest, `rootDir: src`, arquivos `*.spec.ts` (config no bloco `jest` do `package.json`).
- `npm run lint` e `npm run format` (prettier usa o `.editorconfig`: 2 espaços, 100 colunas).

## Testes do renderer (Vitest do front)
- `npm run test:renderer` roda `renderer/**/*.test.tsx` com o Vitest, o jsdom e o `setup.ts` do front (config em `vitest.renderer.config.mts`). `npm run typecheck:renderer` confere os tipos.
- Componentes são testados com `renderWithQuery` (`#test/utils`) e `window.api` falso (`mockApi`, `ok`, `failure` e `payloadsOf` em `renderer/src/test/api-mock.ts`). Nome: `when ..., should ...`.
- O renderer tem suas próprias dependências (fase 09b); `npm run test:renderer` roda as suítes do front copiado e das Configurações.

## Cobertura atual
Fase 03b: janela de Configurações (opções), controle de janela única, atalho, abertura automática, `FolderPicker`, mecanismo de overrides, CSP e `SecretStore` assíncrono (Jest, 220 testes no total); cards recolhíveis, snackbar, seções e cópia do `AppSidebar` (Vitest, 52 testes).

Fase 03a: settings (store, validador, segredos, importação do .env, config do back), serviços e definições de providers, handlers, patch de módulo, fábrica do Gemini, BackRuntime e composição (173 testes no total).

Fase 02: canais, erros, resultado, cliente do front, mapper, registrar, handler base, `AppHandler`, cobertura de canais e ponte do preload (61 testes no total).

Fase 01: `paths`, `front-target`, `window-options`, `navigation-guard`, `static-files`, `backend-ready`, `backend-launcher` (26 testes).

Não coberto: `main/index.ts` (cola com o Electron real), `preload/index.ts` e `constants.ts`.
