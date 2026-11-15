# Fase 09c — Limpeza final, smoke E2E e docs

Status: concluída

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
- **Risco do `Local State` do safeStorage (tratado):** medi no Electron real: depois de salvar a chave, o `Local State` só aparece no disco ~10 s depois (9,9 s). `LocalStateGuard` (`src/main/local-state-guard.ts`) faz o `app:relaunch` esperar (até 20 s) o arquivo ter a `encrypted_key` antes de sair. Um teste E2E salva a chave, reinicia na hora e confere que ela continua legível. **Franqueza:** num controle com a espera desligada o teste também passou, ou seja, o `app.exit(0)` já gravava o arquivo na saída; a espera é uma garantia que não depende disso. A janela de ~10 s continua valendo só para morte abrupta do processo (kill, queda de energia, crash): nesse caso o segredo recém-salvo se perde e o usuário precisa salvar a chave de novo.
