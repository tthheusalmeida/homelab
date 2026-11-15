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

## Back dentro do main, sem editá-lo
- `BackRuntime` carrega pacotes (`@nestjs/core`, `@google/genai`) e módulos compilados (`back/dist/...`) **a partir do back**, para o Nest ser uma só instância.
- `NestHost` monta o módulo raiz com os módulos do back (a lista do `AppModule` sem o `ConfigModule`), um módulo global que provê o `AppConfig` do back com o `DesktopAppConfig` (Settings) e sobe o HTTP enquanto o front ainda o usa.
- Ponto de extensão: `replaceModuleProvider` troca um provider declarado por um módulo do back antes do Nest subir. Hoje serve ao `GeminiProvider` (declarado em `AIModule` e `VideoModule`).
- `main/composition.ts` monta stores e serviços de configuração com dependências injetadas; `main/index.ts` só faz a cola com o Electron.
- Os services do back leem a configuração **uma vez**, na criação; por isso mudar configuração exige reiniciar o app (`app:relaunch`).

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
- Health da Home hoje usa `fetch` direto com URL completa; passa a usar IPC na fase 4.
- Polling de jobs (1 s) e health (15 s) continuam via TanStack Query.

## Plataformas
- Binários nativos ficam em `resources/bin/<platform>-<arch>/` (ex.: `win32-x64`). Um resolvedor escolhe pela plataforma; fora de `win32-x64` devolve `UNSUPPORTED_PLATFORM` com mensagem clara.
- Dados do usuário em `app.getPath('userData')`.
