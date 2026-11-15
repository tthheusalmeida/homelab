# Fase 09c — Limpeza final, smoke E2E e docs

Status: pendente

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
