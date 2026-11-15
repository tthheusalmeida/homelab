# Fase 02 — Infra IPC

Status: concluída

## Objetivo
Toda a base para escrever handlers, provada por dois canais triviais. Nenhum domínio migrado.

## Escopo
- `src/shared`: `channels.ts` (`IpcChannels`, `allChannels`), `errors.ts` (`IpcErrorCode`, `IpcError`, mensagens), `result.ts` (`IpcResult`, `ok`/`fail`), `contracts/` (tipos de request/response por canal), `renderer-api.ts` (`RendererApi`) e `ipc-client.ts` (cliente do front).
- `src/ipc`: `IpcMainLike`, `IpcHandler` (abstract, com `routes()` e `route()`), `IpcRegistrar`, `IpcErrorMapper`, `handlers/AppHandler` (`app:ping`, `app:version`) e `handlers/index.ts` (`createHandlers`, lista única de handlers).
- Preload: `window.api.invoke`, restrito à lista de canais de `IpcChannels`, empacotado em um arquivo único com esbuild.
- `main/index.ts` registra os handlers antes de abrir a janela.

## Decisões (registradas na entrega)
- **Nada em `back/` nem `front/` foi alterado.** O cliente do front (`ipc-client.ts`) vive em `desktop/src/shared`. Ele só passa a ser consumido pelo renderer na fase 04, quando o build do renderer do desktop substituir os `api.ts` (ver `migracao.md`).
- **Handlers declaram rotas, não registram:** `routes()` devolve `{ channel, run }`. Envelope, mapeamento de erro, validação de canal e registro no Electron ficam só no `IpcRegistrar` (uma responsabilidade em um único lugar). Isso substitui o exemplo antigo de `arquitetura.md` (`register()` + `handle`).
- **Rotas tipadas** pelo contrato: `route(IpcChannels.x, (payload) => ...)` infere payload e retorno de `IpcContracts`.
- **Canal não declarado ou duplicado** falha na hora do registro (erro de programação).
- **Mapper sem depender do Nest:** exceção com `getStatus()` 404 → `NOT_FOUND`, 400 → `VALIDATION`; `IpcError` mantém o código; o resto → `INTERNAL` com a mensagem original.
- **Canal fora da lista no preload é rejeitado** (promise rejeitada), sem chegar ao main.
- **Preload com esbuild:** com `sandbox: true` o preload não resolve imports locais, então `build:preload` gera um único `dist/preload/index.js` (só `electron` fica externo).

## Testes unitários
- Canais únicos, no formato `<domínio>:<ação>`.
- `IpcError` (mensagem padrão), `ok`/`fail`, `createIpcClient` (devolve `data`; lança `IpcError`; propaga rejeição).
- `IpcErrorMapper`: cada tipo de exceção.
- `IpcRegistrar`: registra todas as rotas, envelope ok/falha, payload repassado, duplicado e não declarado lançam.
- `AppHandler` e cobertura de canais: todo canal declarado tem handler (`createHandlers`).
- Preload (`createBridge`): canal permitido, canal rejeitado, expõe só `invoke`.

## Verificado nesta entrega
- `npm test`: 17 suítes, 61 testes passando; `npm run lint` e `npm run build:main` sem erros.
- Execução real do Electron (build) inspecionada por CDP dentro do renderer: `app:ping` → `{ ok: true, data: 'pong' }`; `app:version` → `{ ok: true, data: '0.0.1' }`; canal inexistente é rejeitado; `window.api` tem só `invoke`; `window.ipcRenderer`, `require` e `process` são `undefined`. O front carregou via `app://front` (título "HomeLab", React montado).

## O que testar
1. `npm run dev`: o app abre com o DevTools. No console: `await window.api.invoke('app:ping')` → `{ ok: true, data: 'pong' }`.
2. `await window.api.invoke('app:version')` → `{ ok: true, data: '0.0.1' }`.
3. `await window.api.invoke('canal:inexistente')` → rejeitado com "Canal IPC não permitido", sem travar o app.
4. `typeof window.ipcRenderer`, `typeof require` e `typeof process` → `"undefined"`.
5. `npm start`: a Home abre e funciona como na fase 01 (confirma o front estático via `app://front`).

## Critério de aceite
Ping e version funcionam, segurança do renderer confirmada, o app segue funcionando como na fase 01.
