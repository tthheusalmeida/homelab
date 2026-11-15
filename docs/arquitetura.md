# Arquitetura

## Processos
- **main** (Node): sobe o contêiner Nest (DI), registra os handlers IPC, cria a janela, guarda settings e segredos. Executa tudo que toca disco, rede, ffmpeg, Whisper e Ollama.
- **preload**: roda isolado e expõe `window.api` via `contextBridge`. É o único elo entre o renderer e o main.
- **renderer**: o front React. Não tem acesso a Node. Fala com o main só por `window.api`.

## Estrutura (alvo)
```
desktop/
  src/
    main/        bootstrap, janela, contêiner Nest
    preload/     contextBridge (window.api)
    shared/      channels.ts, errors.ts, result.ts, contracts/*   ← main e front importam
    ipc/         ipc-handler.ts, ipc-registrar.ts, ipc-error-mapper.ts, handlers/*.handler.ts
    settings/    settings-store.ts, secret-store.ts, app-config
  resources/bin/<platform>-<arch>/   binários (não versionados)
  docs/
```

## Back dentro do desktop (desde a fase 09a)
- O código do back vive em `src/back` (copiado de `back/src`, mesma estrutura de módulos): `modules/{ai,chat,health,jobs,library,video}`, `utils` e `config/back-config.ts`. Não há controllers, Swagger, CORS, prefixo `api/v1`, `ConfigModule`, `.env` nem servidor HTTP. O `desktop` não lê mais `../back`.
- `BackContainer` (`main/back-container.ts`) sobe o Nest só como contêiner de DI (`NestFactory.createApplicationContext`) com o `BackModule.forRoot({ config, whisper })`. Os dois entram como providers globais: a `BackConfig` (pastas, URL do Ollama, chave do Gemini; implementada pelo `SettingsBackConfig` sobre o Settings e os segredos) e o `WhisperService` (porta abstrata; quem transcreve é o `DesktopWhisperService`).
- Cada service é declarado em **um só módulo** (o `VideoModule` importa o `AIModule` em vez de repetir `AIService`, `AiUsageService` e os providers), então o `usage` em memória é um só e não é preciso resolver "por módulo".
- O `GeminiProvider` recebe a chave pela `BackConfig`; sem chave ele responde `NOT_CONFIGURED` (antes: provider substituto trocado por metadados do módulo).
- `BackServices` (`main/back-services.ts`) pega as instâncias no contêiner e as entrega aos handlers pelas **portas mínimas** que eles declaram.
- Testes do back foram copiados junto (`src/back/**/*.spec.ts`) e rodam com o Jest do desktop; o ESLint de `src/back` mantém as exceções que o back já tinha (`any` e mocks tipados).

### Como era nas fases 01 a 08 (histórico)
- `BackRuntime` carrega pacotes (`@nestjs/core`, `@google/genai`) e módulos compilados (`back/dist/...`) **a partir do back**, para o Nest ser uma só instância.
- `NestHost` monta o módulo raiz com os módulos do back (a lista do `AppModule` sem o `ConfigModule`), um módulo global que provê o `AppConfig` do back com o `DesktopAppConfig` (Settings) e sobe o HTTP enquanto o front ainda o usa.
- Ponto de extensão: `replaceModuleProvider` troca um provider declarado por um módulo do back antes do Nest subir. Hoje serve ao `GeminiProvider` (declarado em `AIModule` e `VideoModule`) e ao `WhisperService` (declarado só no `AIModule`; `main/whisper-provider.ts` o troca pelo `DesktopWhisperService`, que usa o `WhisperBinaryResolver` e o Settings).
- `NestHost.get(token, módulo)` devolve a instância de um provider **declarada naquele módulo** (`select(módulo).get(token, { strict: true })`). Isso importa porque o `VideoModule` repete o `AIService` e o `AiUsageService`: resolver só pelo token pega a primeira cópia achada, com outro `usage` em memória, e o Uso por IPC divergiria do que o chat registra. `BackServices` (`main/back-services.ts`) carrega a classe do service e a do módulo pelo `BackRuntime` e pega a instância no contêiner; os handlers recebem só **portas mínimas** (ex.: `HealthCheckSource`, `AiCatalog`, `AiUsageSource`, `ChatSource`), nunca o service inteiro. Assim o IPC usa a mesma instância que o HTTP (o `usage` em memória, por exemplo, é um só).
- `main/composition.ts` monta stores e serviços de configuração com dependências injetadas; `main/index.ts` só faz a cola com o Electron.
- Os services do back leem a configuração **uma vez**, na criação; por isso mudar configuração exige reiniciar o app (`app:relaunch`).

## Renderer do desktop
- O renderer é o **próprio front**, copiado para `renderer/src` (fase 09b) com a mesma estrutura de pastas: `app`, `pages/<rota>` (cada uma com `api`, `hooks`, `components`, `types`), `components`, `ui`, `lib`, `hooks`, `test`. Não lê mais `../front`, não tem overrides nem `fetch`.
- Dependências (React 19, Vite, Vitest, Tailwind 4, TanStack Query, React Router, base-ui…) estão no `package.json` do desktop. Instalar com `npm install --legacy-peer-deps` (o plugin do Vite pede Babel 8 e o Jest usa Babel 7).
- **Dois builds, uma saída (`dist-renderer`):** o app principal (raiz `renderer/`, `index.html` e `public`) e a janela de Configurações (raiz `renderer/settings`, em `dist-renderer/settings/`). Em dev, dois servidores (5173 e 5174).
- **Cache do Vite em dev:** cada servidor tem o seu `cacheDir` (`node_modules/.vite-main` e `node_modules/.vite-settings`). Se os dois dividissem `node_modules/.vite`, um invalidaria as dependências do outro e a página falharia com `504 Outdated Optimize Dep` (ex.: `react-router_dom.js`). Se o erro aparecer mesmo assim: feche o `npm run dev`, apague essas pastas de cache e suba de novo.
- **Aliases** (`renderer/vite-aliases.mts` e `paths` do `tsconfig.renderer.json`): `#ui`, `#components`, `#lib`, `#hooks`, `#test` (para `renderer/src`) e `#shared` (contratos IPC em `src/shared`).
- **IPC no renderer:** os `api.ts` de cada página chamam `ipc.invoke(IpcChannels.x)` (`#lib/ipc`), que usa `window.api`. A Home não tem mais URL de serviço: cada serviço declara o `healthChannel` (e a setinha de link do card saiu, pois não há mais endereço).
- **Tipos e testes do renderer:** `tsconfig.renderer.json` e `vitest.renderer.config.mts` (setup em `renderer/src/test/setup.ts`). Testes usam `renderWithQuery`/`createWrapper` (`#test/utils`) e `window.api` falso (`mockApi`, `ok`, `failure`, `payloadsOf` em `#test/api-mock`). Nome: `when ..., should ...`.
- **Janelas:** `SingleWindowController` garante uma só janela de Configurações; `Ctrl+,`/`Cmd+,` (`shortcuts.ts`) abre de qualquer janela; abre sozinha na primeira execução sem chave do Gemini (`first-run.ts`).
- **Tipos e testes do renderer:** `tsconfig.renderer.json` (paths explícitos para os pacotes do front), `renderer/tsconfig.json` (o mesmo, para o editor) e `vitest.renderer.config.mts` (Vitest e `setup.ts` do front).

## Segurança de conteúdo (CSP)
- `buildContentSecurityPolicy` (`src/main/content-security-policy.ts`) gera a política; **nunca** permite `unsafe-eval`.
- **Build:** vai no cabeçalho da resposta do protocolo `app://` (`script-src 'self'`). **Dev:** o `webRequest.onHeadersReceived` troca o cabeçalho das páginas do Vite (permite `unsafe-inline` para o preâmbulo do React Refresh e as origens/WebSockets do HMR).
- `connect-src` é só `'self'` (em dev, mais as origens e WebSockets do Vite): não há HTTP local nem porta do Nest. `img-src` aceita `http:`/`https:` (imagens externas da biblioteca e capas de livros).
- Se uma tela deixar de carregar um recurso, a causa provável é esta política; ajuste só a diretiva necessária e documente aqui.

## Nest como contêiner de DI
- `NestFactory.createApplicationContext(AppModule)` no main. Os handlers recebem os services pelo construtor.
- Os services do back não mudam de lugar nem de regra. Mudam só: `AppConfig` lê do `SettingsStore` e o `GeminiProvider` inicializa de forma tardia (sem chave, não derruba o boot).
- Até a fase 9 o app também sobe o servidor HTTP do Nest, para os domínios ainda não migrados.
- `@nestjs/config` v12 é ESM e já é evitado; o main é compilado em CJS.

## Handlers IPC (classes)
Princípios: uma classe por domínio (S), nova funcionalidade entra com novo handler sem mexer nos existentes (O), todos respeitam o contrato de `IpcHandler` (L), contratos pequenos (I), dependem de abstrações injetadas (D).

- `IpcHandler` (abstract): cada handler implementa `routes()` e declara as rotas com `this.route(canal, run)`, que tipa payload e retorno pelo contrato do canal (`shared/contracts`). O handler **não** registra nada nem trata erro.
- `IpcRegistrar`: recebe os handlers, valida cada canal (declarado em `IpcChannels`, sem duplicata), embrulha a rota no envelope `IpcResult`, converte exceções com o `IpcErrorMapper` e registra no `IpcMainLike`. É o único lugar com essa regra.
- `IpcMainLike`: interface mínima (`handle(channel, listener)`). O `ipcMain` real e o `FakeIpcMain` dos testes (`src/ipc/testing`) a implementam; handlers nunca importam `electron`.
- Um handler não contém regra de negócio: converte payload, chama o service, devolve o resultado.
- Novos handlers entram na lista de `createHandlers` (`ipc/handlers/index.ts`); um teste garante que todo canal declarado tem handler.

```ts
export class LibraryHandler extends IpcHandler {
  constructor(private readonly library: LibraryService) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.inbox, () => this.library.inbox()),
      this.route(IpcChannels.library.documents.get, ({ id }) => this.library.get(id)),
    ];
  }
}
```

## Constantes (nada repetido solto)
- `shared/channels.ts`: `IpcChannels` (objeto `as const`), formato `<domínio>:<ação>` (ex.: `library:documents:get`). Test garante canais únicos e no formato.
- `shared/errors.ts`: `IpcErrorCode` (`NOT_FOUND`, `VALIDATION`, `NOT_CONFIGURED`, `UNSUPPORTED_PLATFORM`, `PROVIDER_FAILED`, `INTERNAL` …) e mensagens padrão em português.
- Front e main importam as mesmas constantes; nenhum canal ou código aparece como string literal fora desses arquivos.

## Envelope de resultado
- Todo canal responde `IpcResult<T>`: `{ ok: true, data }` ou `{ ok: false, error: { code, message } }`.
- Exceções não vazam como erro cru do Electron. `NotFoundException` (Nest) → `NOT_FOUND`; erros de validação → `VALIDATION`; erro de configuração ausente → `NOT_CONFIGURED`; o restante → `INTERNAL`, preservando a mensagem em português já existente nos services.
- No front, o cliente (`shared/ipc-client.ts`, `createIpcClient(window.api)`) chama `window.api`, desembrulha o envelope e **lança `IpcError`** (um `Error` com `code`) quando `ok` é falso. Assim hooks, TanStack Query e telas continuam tratando erro como hoje.

## Preload e segurança
- `BrowserWindow`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, sem `remote`.
- O preload expõe `window.api.invoke(channel, payload)` restrito à lista de canais permitida (`allChannels()`, derivada de `IpcChannels`); canal fora da lista é rejeitado. Nunca expõe `ipcRenderer`.
- Com `sandbox: true` o preload não resolve imports locais; `build:preload` (esbuild) gera um único `dist/preload/index.js`.
- Navegação externa bloqueada; links externos abrem no navegador do sistema.

## Front durante a migração
- Cada `pages/**/api.ts` mantém as mesmas assinaturas de função; só o corpo muda (de `api("/rota")` para `ipc(IpcChannels.x, payload)`). Hooks, componentes e testes de tela não mudam; os testes de `api.ts` passam a mockar `window.api`.
- Health da Home usava `fetch` direto com URL completa; desde a fase 4 a cópia de `checkService(url)` escolhe o canal pelo final da URL (`/health/system` ou `/health/ai`), sem mudar assinatura nem hook.
- Polling de jobs (1 s) e health (15 s) continuam via TanStack Query.

## Plataformas
- Binários nativos ficam em `resources/bin/<platform>-<arch>/` (ex.: `win32-x64`). O `WhisperBinaryResolver` (`src/providers`) confere o executável configurado; sem ele, fora de `win32-x64` devolve `UNSUPPORTED_PLATFORM` com mensagem clara (ver `configuracoes.md`).
- Jobs: `JobCatalog` (consulta, com o `Job` do back convertido para JSON como o HTTP fazia) e `JobLauncher` (valida as dicas, cria o job e o enfileira no `JobRunner` do back) ficam em `src/jobs` e o `BackServices` os monta com as instâncias do `JobsModule`; o `JobHandler` só delega.
- Dados do usuário em `app.getPath('userData')`.
