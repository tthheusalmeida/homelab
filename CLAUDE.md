# CLAUDE.md — Desktop (homelab-desktop)

App desktop (Windows primeiro; depois Linux e macOS) do HomeLab: **Electron + React + IPC**. É a raiz do projeto Electron e substitui a comunicação HTTP entre `front` e `back` por **IPC**. Objetivo da migração: o que já funciona hoje continua funcionando, agora dentro do Electron e via IPC. **Sem melhorias de produto** nesta migração.

- `front/` (repo separado): renderer React 19 + Vite, **sem mudança de UI**, exceto a tela de Configurações (substitui o `.env`).
- `back/` (repo separado): services do Nest 11 reaproveitados no processo main. Nest vira só contêiner de injeção de dependência (`createApplicationContext`, sem HTTP no final). Os controllers são trocados por handlers IPC.
- `desktop/` (este repo): `main`, `preload`, `shared` (contratos IPC), handlers, settings e empacotamento.

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
| `docs/fases/fase-00.md` … `fase-10.md` | Escopo, testes e checklist de cada entrega |

Regras de negócio (biblioteca, jobs, IA, vídeo) continuam documentadas em `back/doc/` e `front/doc/`. Não duplique aqui; ao tocar nesses repos, leia o `CLAUDE.md` de cada um.

## Comandos
Ainda não há `package.json` (nasce na fase 1). Ao criá-lo, documente os scripts aqui (`dev`, `build`, `test`, `lint`).

## Mapa do código (alvo; criado ao longo das fases)
- `src/main/` — bootstrap do Electron, janela, contêiner Nest (DI)
- `src/preload/` — `contextBridge` expondo `window.api` tipado
- `src/shared/` — **contratos usados por main e front**: `channels.ts` (constantes dos canais), `result.ts` (`IpcResult`), `contracts/*` (request/response por domínio)
- `src/ipc/` — `IpcHandler` (base), `IpcRegistrar`, `ipc-error-mapper`, `handlers/*.handler.ts`
- `src/settings/` — `SettingsStore`, segredos (`safeStorage`), `AppConfig` sobre o store
- `resources/bin/<platform>-<arch>/` — binários nativos (Whisper). Não versionados.
- `docs/` — documentação

## Convenções
- Textos de interface e mensagens de erro em **português**; código e commits em inglês.
- **Handlers IPC são classes** (`extends IpcHandler`), uma por domínio, com dependências injetadas (SOLID, clean code). Detalhes em `docs/arquitetura.md`.
- **Nada repetido em string solta**: nomes de canal, códigos de erro e mensagens ficam em constantes (`shared/channels.ts`, `shared/errors.ts`). Handler e front importam as mesmas constantes.
- **Sem `.env`**: caminhos, URLs e chaves vêm de `SettingsStore`, configurados pela tela de Configurações. Nenhum caminho fixo no código. Segredos cifrados com `safeStorage`.
- Providers separados: **externos** (Gemini e outras IAs) e **locais** (Whisper, Ollama, ffmpeg). Ver `docs/configuracoes.md`.
- Segurança do renderer: `contextIsolation: true`, `nodeIntegration: false`; o preload expõe só métodos tipados, nunca `ipcRenderer`.
- Durante a migração o Nest serve HTTP **e** IPC; cada domínio migrado troca só o `api.ts` do front de `fetch` para `window.api`. O HTTP só é removido na fase 9.
- Imports absolutos a partir de `src/` (alias), como no back.
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
- Handlers são testados com `IpcMainLike` falso e service mockado, sem Electron real.
- Não chamar serviços reais (rede, ffmpeg, Whisper, Gemini, Ollama) em testes: use mocks.
- Se uma mudança quebrar um teste, decida se é regressão (corrija o código) ou mudança de regra (atualize teste **e** `docs/`).
- Ao mudar comportamento, atualize o `docs/` correspondente na mesma entrega.
