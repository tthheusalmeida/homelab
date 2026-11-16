# Fase 11 — Validação do padrão de commits e do fluxo de branches

Status: pendente (planejada; fazer depois)

## Objetivo
Garantir por automação o que `docs/versionamento.md` já pede: commits em Conventional Commits, nada direto na `main`, toda mudança por branch e merge request.

## Escopo
- **Local:** `husky` + `commitlint` (`@commitlint/config-conventional`) com o gancho `commit-msg`; `pre-push` rodando `npm run lint`, `npm run typecheck:renderer` e os testes. Os ganchos instalam sozinhos no `npm install` (`prepare`); sem eles, a CI ainda barra.
- **`commitlint.config.cjs`** com os tipos de `versionamento.md` (`feat`, `fix`, `perf`, `refactor`, `style`, `docs`, `test`, `build`, `ci`, `chore`, `revert`), descrição em inglês, primeira linha até 72 caracteres.
- **GitHub (`.github/workflows/pr.yml`)** em todo MR para a `main`:
  1. valida o título do MR (action `amannn/action-semantic-pull-request`) e as mensagens dos commits (`commitlint --from base --to head`);
  2. `npm ci --legacy-peer-deps`, lint, Jest, Vitest e typecheck do renderer.
- **Proteção da `main`** (configuração do repositório, feita pelo usuário): exigir MR, exigir os checks acima verdes, bloquear push direto e *force push*. Merge só por *squash* ou *rebase*.
- **Template de MR** (`.github/pull_request_template.md`) com o checklist de `versionamento.md`.
- Atualizar `CLAUDE.md` e `versionamento.md`: tirar o "estado: validação manual" quando isto estiver no ar.
- Fora do escopo: release e changelog (fase 12), atualização no app (fase 13).

## Testes
- Mensagens válidas e inválidas contra a config do commitlint (script `npm run test:commitlint` com exemplos: `feat: x` passa; `Added x`, `feat:x`, `FEAT: x` e primeira linha longa falham).
- Rodar o workflow numa branch de teste e confirmar que um título fora do padrão reprova o MR.
- Suítes existentes continuam passando.

## O que testar
1. `git commit -m "arrumei coisa"` é recusado com mensagem clara; `git commit -m "fix: correct x"` passa.
2. `git push` de uma branch com lint quebrado é barrado pelo `pre-push`.
3. Abrir um MR com título `Atualização` reprova o check; trocar para `feat: ...` aprova.
4. Tentar `git push origin main` é recusado pelo GitHub (proteção de branch).

## Critério de aceite
Nenhuma forma comum de chegar à `main` sem MR, sem checks verdes e sem commits no padrão.

## Riscos e decisões a tomar
- Desenvolvedor único: exigir aprovação de revisor trava o fluxo; usar "exigir MR" com 0 aprovações e os checks obrigatórios.
- `--legacy-peer-deps` na CI (ver pendência do Babel na memória do projeto); decidir se resolve antes.
