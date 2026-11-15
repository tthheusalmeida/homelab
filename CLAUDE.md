# CLAUDE.md — Desktop (homelab-desktop)

App desktop (Windows primeiro; depois Linux e macOS) do HomeLab: **Electron + React + IPC**. É a raiz do projeto Electron e substitui a comunicação HTTP entre `front` e `back` por **IPC**. Objetivo da migração: o que já funciona hoje continua funcionando, agora dentro do Electron e via IPC. **Sem melhorias de produto** nesta migração.

- `front/` (repo separado): renderer React 19 + Vite, **sem mudança de UI**, exceto a tela de Configurações (substitui o `.env`).
- `back/` (repo separado): services do Nest 11 reaproveitados no processo main. Nest vira só contêiner de injeção de dependência (`createApplicationContext`, sem HTTP no final). Os controllers são trocados por handlers IPC.
- `desktop/` (este repo): `main`, `preload`, `shared` (contratos IPC), handlers, settings e empacotamento.

**Regra: não alterar `back/` nem `front/`.** Todo código novo, adaptação e override vive só em `desktop/`; nenhum arquivo ou commit nos outros repos. Só é permitido **ler** e rodar os scripts deles (`build`, `test`). Se uma fase exigir mudança neles, pare e pergunte antes.

Estado: **migração em andamento, por fases**. Ver `docs/migracao.md`.

## Como consultar
**Leia `docs/` antes de abrir código.** Cada arquivo descreve em frases uma área. Abra só o que a tarefa pede; para trabalhar numa fase, leia apenas `docs/fases/fase-XX.md` dela.

| Arquivo | Assunto |
|---|---|
| `docs/migracao.md` | Visão geral, decisões, tabela de fases e status, regra de entrega |
| `docs/arquitetura.md` | Processos, estrutura de pastas, Nest como DI, padrão dos handlers (classes/SOLID), envelope de resultado, preload e segurança |
| `docs/ipc-canais.md` | Inventário dos 37 endpoints HTTP → canais IPC (nomes e payloads) |
| `docs/configuracoes.md` | Settings (substitui `.env`), providers externos e locais, segredos, binários por plataforma |
| `docs/testing.md` | Convenções de teste, mocks, checklist manual e smoke E2E |
| `docs/regras-de-negocio.md` | Onde ficam as regras que **não mudam** (`back/doc`, `front/doc`) |
| `docs/fases/fase-00.md` … `fase-10.md` (com 03a/03b, 06a/06b, 07a/07b) | Escopo, testes e checklist de cada entrega |

Regras de negócio (biblioteca, jobs, IA, vídeo) continuam documentadas em `back/doc/` e `front/doc/`. Não duplique aqui; ao tocar nesses repos, leia o `CLAUDE.md` de cada um.

## Comandos
- `npm run dev` — compila back e main, sobe o front (Vite) e abre o Electron apontando para ele
- `npm start` — build completo (back, front, main) e abre o app com o front estático
- `npm run build` / `build:back` / `build:front` / `build:main`
- `npm test` (Jest, `src/**/*.spec.ts`) / `npm run test:watch` / `npm run test:cov`
- `npm run lint` / `npm run format`

## Mapa do código (alvo; criado ao longo das fases)
- `src/main/` — `index.ts` (bootstrap), `constants.ts`, `paths.ts`, `front-target.ts`, `window-options.ts`, `navigation-guard.ts`, `static-files.ts` (protocolo `app://`), `back-runtime.ts`, `nest-host.ts`, `module-patch.ts`, `gemini-provider-factory.ts` (Nest do back no main sem editá-lo), `backend-ready.ts`, `composition.ts`, `electron-cipher.ts`
- `src/preload/` — `contextBridge` expondo `window.api` tipado
- `src/shared/` — **contratos usados por main, preload e front**: `channels.ts` (`IpcChannels`), `errors.ts` (`IpcErrorCode`, `IpcError`), `result.ts` (`IpcResult`), `contracts/` (request/response por canal), `renderer-api.ts`, `ipc-client.ts` (cliente do front)
- `src/ipc/` — `IpcHandler` (base, `routes()`), `IpcRegistrar`, `IpcErrorMapper`, `IpcMainLike`, `handlers/*.handler.ts` + `handlers/index.ts` (`createHandlers`), `testing/FakeIpcMain`
- `src/settings/` — `SettingsStore`, `SecretStore` (`safeStorage`), validador, defaults, `DesktopAppConfig` (o `AppConfig` do back sobre o store), importação única do `.env`
- `src/providers/` — serviços e definições dos providers externos (Gemini) e locais (Whisper, Ollama, ffmpeg)
- `resources/bin/<platform>-<arch>/` — binários nativos (Whisper). Não versionados.
- `docs/` — documentação

## Convenções
- Textos de interface e mensagens de erro em **português**; código e commits em inglês.
- **Handlers IPC são classes** (`extends IpcHandler`), uma por domínio, com dependências injetadas (SOLID, clean code). Detalhes em `docs/arquitetura.md`.
- **Nada repetido em string solta**: nomes de canal, códigos de erro e mensagens ficam em constantes (`shared/channels.ts`, `shared/errors.ts`). Handler e front importam as mesmas constantes.
- **Sem `.env`**: caminhos, URLs e chaves vêm de `SettingsStore`/`SecretStore`, configurados pela tela de Configurações (fase 03b). O `.env` do back só é importado uma vez em dev. Nenhum caminho fixo no código. Segredos cifrados com `safeStorage`.
- Providers separados: **externos** (Gemini e outras IAs) e **locais** (Whisper, Ollama, ffmpeg). Ver `docs/configuracoes.md`.
- Segurança do renderer: `contextIsolation: true`, `nodeIntegration: false`; o preload expõe só métodos tipados, nunca `ipcRenderer`.
- Durante a migração o Nest serve HTTP **e** IPC; cada domínio migrado troca só o `api.ts` do front de `fetch` para `window.api`. O HTTP só é removido na fase 9.
- Imports relativos dentro de `desktop/src` (compilação com `tsc` puro, sem reescrita de alias).
- Front: arquivos com CRLF e sem config do prettier; **não** rodar `prettier --write` em pastas, só em arquivos novos.

## Regra de entrega por fase (OBRIGATÓRIO)
- Entregas **faseadas**: uma fase por vez, na ordem de `docs/migracao.md`. **Não comece a fase seguinte sem o "ok" do usuário.**
- Cada fase entrega: código + testes unitários + atualização de `docs/` + checklist manual (`docs/fases/fase-XX.md`).
- Ao terminar, dizer que terminou **e** listar "O que testar" (passos numerados e resultado esperado) do lado do usuário.
- Atualize o status da fase em `docs/migracao.md` ao concluir (só depois do "ok").
- Commits só quando o usuário pedir; mensagem `tipo: descrição` em inglês, divididos por assunto.

## Regras para testes (OBRIGATÓRIO)
- **Toda feature (nova ou alterada) vem com testes unitários na mesma entrega.** Sem teste, não está concluída; cubra caminho feliz, erros e casos de borda.
- Teste ao lado do arquivo (`x.ts` → `x.spec.ts`).
- **Nome de cada teste: `when <situação>, should <resultado>`.**
- Handlers são testados com `FakeIpcMain` (registrados via `IpcRegistrar`) e service mockado, sem Electron real.
- Não chamar serviços reais (rede, ffmpeg, Whisper, Gemini, Ollama) em testes: use mocks.
- Se uma mudança quebrar um teste, decida se é regressão (corrija o código) ou mudança de regra (atualize teste **e** `docs/`).
- Ao mudar comportamento, atualize o `docs/` correspondente na mesma entrega.
