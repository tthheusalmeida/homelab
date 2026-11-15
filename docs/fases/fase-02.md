# Fase 02 — Infra IPC

Status: pendente

## Objetivo
Toda a base para escrever handlers, provada por dois canais triviais. Nenhum domínio migrado.

## Escopo
- `src/shared`: `channels.ts` (`IpcChannels`), `errors.ts` (`IpcErrorCode` e mensagens), `result.ts` (`IpcResult`, helpers `ok`/`fail`).
- `src/ipc`: `IpcMainLike`, `IpcHandler` (abstract), `IpcRegistrar`, `IpcErrorMapper`, `AppHandler` (`app:ping`, `app:version`).
- Preload: `window.api.invoke` restrito à lista de canais de `IpcChannels`, tipado por canal.
- Front: `#lib/ipc.ts` (desembrulha `IpcResult`, lança `Error` quando `ok` é falso) e tipos globais de `window.api`; alias para importar `shared`.
- Documentar a base em `arquitetura.md` se algo mudar.

## Testes unitários
- Canais únicos, no formato `<domínio>:<ação>`.
- `IpcHandler.handle`: sucesso vira `{ ok: true }`; cada exceção vira o código certo; mensagem em português preservada.
- `IpcRegistrar`: registra todos; canal duplicado lança erro.
- `AppHandler`: ping e version.
- Preload: canal fora da lista é rejeitado.
- Front: `#lib/ipc` devolve `data` e lança `Error` com a mensagem do envelope.

## O que testar
1. No DevTools do app: `await window.api.invoke('app:ping')` → `{ ok: true, data: 'pong' }`.
2. `await window.api.invoke('app:version')` → versão do app.
3. `await window.api.invoke('canal:inexistente')` → rejeitado, sem travar o app.
4. Confirmar que `window.ipcRenderer` e `require` **não** existem no renderer.

## Critério de aceite
Ping e version funcionam, segurança do renderer confirmada, o app segue funcionando como na fase 01.
