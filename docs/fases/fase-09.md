# Fase 09 — Remover o HTTP

Status: pendente

## Objetivo
App 100% IPC. Remover tudo que sobrou do modelo cliente/servidor.

## Escopo
- Trocar `createApplicationContext` como único modo; remover o servidor HTTP, controllers, Swagger, CORS, prefixo `api/v1`, `PORT` e `CORS_ORIGIN`.
- Remover o `.env`, `.env.example`, a importação do `.env` e `env.validation` do back; remover `VITE_API_URL` e o `fetch` de `#lib/api` no front.
- Decidir e documentar como consolidar `front` e `back` com o `desktop` (referência por caminho, submódulo ou monorepo).
- Smoke E2E com Playwright para Electron: abrir o app, navegar nas telas principais, criar um artigo.
- Atualizar `back/doc/env.md`, `back/CLAUDE.md`, `front/CLAUDE.md`, `front/doc/lib.md` e `docs/` ao novo cenário.

## Testes unitários
- Suítes completas do main e do front.
- Nenhum teste referencia HTTP, `VITE_API_URL` ou `EnvKeys`.
- Smoke E2E passando.

## O que testar
1. Regressão completa seguindo os checklists de 04 a 08.
2. Aba Network do DevTools: nenhuma requisição a `localhost:3000`.
3. Nenhuma porta aberta pelo app (`netstat`).
4. Usuário novo (`userData` limpo): primeira execução, configuração e uso.

## Critério de aceite
Todos os fluxos funcionam sem HTTP e sem `.env`; documentação consistente.
