# Fase 09c — Limpeza final, smoke E2E e docs

Status: implementada parcialmente (falta o risco do `Local State`; aguardando ok)

## Objetivo
Fechar a independência e provar o app de ponta a ponta.

## Escopo planejado
- Copiar `back/doc` e `front/doc` para `desktop/docs` (regras de negócio que não mudam) e ajustar `docs/regras-de-negocio.md`.
- Remover do desktop qualquer referência restante a `../front`, `../back`, `HOMELAB_FRONT_DIR`, `.env`, `VITE_API_URL`, HTTP; revisar scripts (`dev`, `build`, `start`).
- **Smoke E2E com Playwright para Electron:** abrir o app, navegar nas telas principais e criar um artigo.
- Teste de usuário novo (`userData` limpo) automatizado, e verificação de que nenhuma porta é aberta.
- Atualizar `CLAUDE.md`, `docs/arquitetura.md`, `docs/testing.md` e `docs/migracao.md` para o cenário final.
- Tratar o risco anotado na fase 08 (o `Local State` do `safeStorage` só é gravado ~10 s depois do primeiro uso): por exemplo, confirmar a gravação antes de reiniciar o app.

## Testes
Suítes completas do main e do renderer; nenhum teste referencia HTTP, `VITE_API_URL` ou `EnvKeys`; smoke E2E passando.

## O que testar
Regressão completa seguindo os checklists das fases 04 a 08; aba Network sem `localhost`; `netstat` sem portas; primeira execução de usuário novo.

## Como ficou (até agora)
- Regras de negócio copiadas para `docs/regras/back` e `docs/regras/front` (sem o `env.md`, substituído por `configuracoes.md`); `regras-de-negocio.md`, `lib.md`, `home.md` e a CSP em `arquitetura.md` ajustados. Nenhuma referência a `../front`, `../back`, `HOMELAB_FRONT_DIR`, `VITE_API_URL` ou `EnvKeys` sobrou em código, testes ou scripts.
- Smoke E2E (`e2e/smoke.spec.ts`, 6 testes, `npm run test:e2e`) passando: Home, navegação, criar artigo, zero requisições http, usuário novo abre as Configurações, nenhuma porta TCP em escuta. A porta de depuração que o Playwright abre no Electron que ele controla é do próprio Playwright, por isso a checagem de portas usa um Electron lançado à parte.
- **Pendente:** o risco do `Local State` do safeStorage (gravado ~10 s depois do primeiro uso) ainda não foi tratado.
