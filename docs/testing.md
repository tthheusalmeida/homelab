# Testes (desktop)

## Camadas
- **Unitários do main** (`src/**/*.spec.ts`): Jest + ts-jest, mesmo padrão do back. Cobrem handlers, registrar, mapper de erro, settings, resolvedor de binário, constantes.
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

## O que é mockado
- Rede/IA: Gemini (`@google/genai`) e Ollama (`HttpService`).
- Binários: `child_process.execFile` (ffmpeg, Whisper); `fs` onde necessário.
- Electron: `ipcMain`, `app`, `safeStorage` e `BrowserWindow` atrás de interfaces/wrappers; nenhum teste unitário abre janela.
- Arquivos: pasta temporária do SO, removida ao final.
- Front: `window.api` (nunca o Electron real), hooks de dados quando a tela exige.

## Rodar
Comandos entram aqui na fase 1, junto com o `package.json`.

## Cobertura atual
Nenhuma (migração não iniciada).
