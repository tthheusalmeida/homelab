# Versionamento, commits e fluxo de mudanças

Desde a versão `0.1.x` o projeto segue **SemVer** para versões e **Conventional Commits** para mensagens. A versão deixa de ser escolhida "no olho": ela sai dos commits.

> Estado: a convenção vale e é **validada por automação** (ganchos locais e CI, seção "Validação ao subir para o GitHub"). O **release automatizado** está em `docs/fases/fase-12.md`.

## SemVer (`MAJOR.MINOR.PATCH`)
| Mudança | Sobe | Exemplo |
|---|---|---|
| Correção que não muda o uso (`fix`) | PATCH | `0.1.1` → `0.1.2` |
| Funcionalidade nova compatível (`feat`) | MINOR | `0.1.2` → `0.2.0` |
| Quebra de compatibilidade (`!` ou `BREAKING CHANGE`) | MAJOR | `0.2.0` → `1.0.0` |

- Enquanto a versão for `0.x`, uma quebra de compatibilidade sobe o MINOR (`0.2.0` → `0.3.0`); o `1.0.0` é decisão do usuário.
- "Quebra" aqui é o que o usuário final sente: formato de dados em disco que exige migração, canal IPC removido, configuração que muda de lugar.
- A versão fica em `package.json` (e `package-lock.json`) e dá o nome ao instalador (`HomeLab-Setup-<versão>.exe`). Tag e Release no GitHub: `v<versão>`.
- Os pacotes de componentes (`components-vN`, ver `componentes.md`) têm versão própria e **não** acompanham a do app.

## Mensagem de commit (Conventional Commits)
```
tipo(escopo opcional)!: descrição curta em inglês, no imperativo

Corpo opcional: o quê e por quê.

BREAKING CHANGE: só quando houver quebra (ou use o `!` depois do tipo)
Co-Authored-By: ...
```
| Tipo | Quando | Efeito no SemVer |
|---|---|---|
| `feat` | funcionalidade nova | MINOR |
| `fix` | correção de erro | PATCH |
| `perf` | melhora de desempenho | PATCH |
| `refactor`, `style` | muda o código sem mudar o comportamento | nenhum |
| `docs` | só documentação | nenhum |
| `test` | só testes | nenhum |
| `build` | empacotamento, dependências, scripts de build | nenhum |
| `ci` | pipelines | nenhum |
| `chore` | manutenção que não cabe nos outros | nenhum |
| `revert` | desfaz um commit anterior | o do commit desfeito |

Regras:
- Tipo em minúsculas, descrição em inglês, sem ponto final, até ~72 caracteres na primeira linha.
- Um assunto por commit (já era regra: "commits por assunto").
- Texto de interface e documentação continuam em português; só a mensagem do commit é em inglês.
- Escopo é opcional e curto (`feat(chat): ...`, `fix(jobs): ...`); use os nomes das áreas de `docs/`.

## Fluxo de mudanças (a partir daqui)
**Nada novo entra direto na `main`.** Toda mudança feita depois da adoção do SemVer segue este caminho:

1. **Branch** a partir da `main` atualizada, com o tipo no nome: `feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>`, `build/<assunto>`, `chore/<assunto>` (minúsculas, hífen).
2. **Commits** no padrão acima, na branch.
3. **Merge request** (no GitHub chama-se *pull request*; neste projeto usamos os dois nomes para a mesma coisa) da branch para a `main`, com o título também no padrão (`feat: ...`), porque o commit de merge usa o título.
4. **Validação** antes do merge: título e commits no padrão, `npm run lint`, `npm test`, `npm run test:renderer` e `npm run typecheck:renderer` passando.
5. **Merge** com *squash* (um commit por MR, com o título do MR) ou *rebase*; nunca commit de merge solto. A `main` fica sempre com o histórico em Conventional Commits.
6. **Versão e Release** saem da `main` (manual hoje, automatizado na fase 12).

Exceções (podem ir direto na `main`): apenas a correção de um erro da própria `main` quebrada, e só com o ok do usuário.

## Validação ao subir para o GitHub
Três camadas, para nenhuma mensagem fora do padrão chegar à `main`:
- **Local** (`.husky/commit-msg`): `commitlint` (`commitlint.config.cjs`) recusa o commit se a mensagem não segue o padrão. Os ganchos se instalam sozinhos no `npm install` (script `prepare`).
- **Local** (`.husky/pre-push`): roda `lint`, `typecheck:renderer`, Jest e Vitest antes de enviar. Em emergência, `git push --no-verify` pula, mas a CI barra do mesmo jeito.
- **GitHub** (`.github/workflows/pr.yml`, em todo PR para a `main`): o job **Commits e título** valida o título do PR (`amannn/action-semantic-pull-request`) e as mensagens dos commits (`commitlint --from base --to head`); o job **Lint, tipos e testes** roda `test:commitlint`, lint, typecheck, Jest e Vitest.
- **Proteção da `main`** (configuração do repositório, ver `empacotamento.md` > "Passos manuais no GitHub"): exigir PR, exigir os dois jobs verdes, bloquear push direto e *force push*, só *squash* ou *rebase*.

Testar a config de mensagens: `npm run test:commitlint` (exemplos válidos e inválidos).

## Checklist manual (o que a automação não cobre)
- [ ] Estou numa branch `tipo/assunto`, não na `main`.
- [ ] Cada commit tem `tipo: descrição` em inglês e um só assunto.
- [ ] O título do MR também segue o padrão.
- [ ] Lint, Jest, Vitest e typecheck passam.
- [ ] Mudou comportamento → `docs/` atualizado na mesma branch.
- [ ] Mudou algo que o usuário sente e quebra compatibilidade → `!` ou `BREAKING CHANGE` no commit.
