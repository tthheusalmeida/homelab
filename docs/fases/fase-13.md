# Fase 13 — Atualização automática no app (diferencial)

Status: **aguardando validação**. Entregue: `electron-updater` atrás da porta `NativeUpdater` (download só da diferença, em segundo plano, no Windows empacotado), estado `ready` com "Reiniciar e atualizar" no cartão da barra lateral e em Configurações > Sobre e atualizações, notificação de "pronta", `updates.autoCheck` com o canal `updates:set-auto-check`, bloco `publish` do `electron-builder.yml` (fase 12) e remoção do instalador inteiro (`windows-installer.ts`). O comportamento está em `docs/atualizacoes.md`.

## O que testar (precisa do app instalado; não dá para validar remotamente)
Pré-requisito: a CI da fase 12 já publicou pelo menos dois releases (`N` e `N+1`) com `.exe`, `.blockmap` e `latest.yml`. O primeiro release com o atualizador novo só atualiza quem já o tem; para testar o fluxo, instale o `N` e deixe o `N+1` sair.
1. Instalar a versão `N` do Release. Abrir: em até ~15 s o cartão "Atualização N+1 disponível" aparece, o download avança sem travar o app e o cartão vira "Atualização N+1 pronta".
2. Conferir que o tráfego é bem menor que o instalador inteiro (atualização diferencial). Se baixar o instalador todo, o app funciona do mesmo jeito (ver "Limites" em `atualizacoes.md`).
3. Clicar em "Reiniciar e atualizar" e confirmar: o app reabre na versão `N+1`, com biblioteca, conversas, chave do Gemini e modelos intactos, sem o assistente de instalação reaparecer; Configurações > Sobre e atualizações mostra a versão nova.
4. Repetir o 1 e, em vez de clicar, **fechar o app**: ao abri-lo de novo, já está na `N+1` (instalação ao fechar).
5. Sem internet, abrir o app: nenhum erro na tela; "Verificar agora" mostra a falha com clareza.
6. Desligar "Verificar atualizações automaticamente", fechar e reabrir: nada é consultado (o "Última verificação" fica em "Ainda não verificou nesta sessão"); "Verificar agora" continua funcionando.
7. Com o download interrompido (desligar a rede no meio): volta a "disponível" com a mensagem e o botão "Baixar atualização" tenta de novo.
8. Linux (AppImage): o app avisa da versão nova e o botão abre o Release no navegador.

## Riscos
- O download diferencial e a instalação silenciosa só foram exercitados com o `electron-updater` falso nos testes; o fluxo real (NSIS + `latest.yml` + `.blockmap`) só se confirma com dois releases reais.
- Sem assinatura de código, o SmartScreen pode avisar de novo depois da atualização.
- Releases de componentes e de binários nunca contam como "último Release do app": a versão vem de `GitHubReleaseSource` (só tags `v<x.y.z>`) e o feed do atualizador é fixado na pasta de download dessa tag.
