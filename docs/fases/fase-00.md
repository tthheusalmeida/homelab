# Fase 00 — Linha de base e inventário

Status: aguardando validação

## Objetivo
Registrar o estado atual antes de qualquer mudança, para provar depois que nada regrediu.

## Escopo
- Rodar `npm test`, `npm run build` e `npm run lint` no `back` e no `front` e anotar o resultado abaixo.
- Conferir o inventário de canais em `ipc-canais.md` contra os controllers e `front/src/**/api*.ts`.
- Anotar a versão estável atual do Electron a usar na fase 1 (consultar a documentação oficial no momento).
- Nenhuma mudança de código.

## Linha de base (preencher)
| Repo | Testes | Build | Lint |
|---|---|---|---|
| back | 39 suítes, 576 testes passando | ok | 34 erros e 1 aviso (ver abaixo) |
| front | 99 arquivos, 994 testes passando | ok | 0 erros e 13 avisos |

Electron estável escolhido: **45.3.2** (`npm view electron` em 2026-11-15; exige Node >= 22.12, o ambiente tem 22.18). Reconfirmar na fase 01 antes de instalar.

Lint do back: os 34 erros estão em 11 arquivos `*.spec.ts` (`no-unsafe-member-access` sobre `any` nos mocks) e o aviso em `main.ts`; nenhum em código de produção. É dívida anterior à migração, **não será corrigida** aqui. O critério de não regressão é: nenhum erro novo.

## O que testar
1. Ler `ipc-canais.md` e confirmar que nenhum endpoint que você usa ficou de fora.
2. Confirmar que as suítes do back e do front passam no seu ambiente.

## Critério de aceite
Linha de base registrada e inventário conferido pelo usuário.
