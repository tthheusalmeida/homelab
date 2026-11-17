<!--
Título no padrão Conventional Commits, em inglês: `tipo(escopo opcional)!: descrição`
Ex.: `feat: add chat export`, `fix(jobs): keep progress after restart`.
`feat` e `fix` geram uma versão nova do app quando entram na main; os demais tipos esperam o próximo.
-->

## O que muda
<!-- Em poucas frases: o quê e por quê. -->

## Checklist
- [ ] Branch `tipo/assunto` a partir da `main` atualizada
- [ ] Título do PR e commits em Conventional Commits (conferido pela CI)
- [ ] Lint, Jest, Vitest e typecheck passando (conferido pela CI)
- [ ] Testes novos ou ajustados na mesma entrega
- [ ] `docs/` atualizado se o comportamento mudou
- [ ] Quebra de compatibilidade marcada com `!` ou `BREAKING CHANGE`
