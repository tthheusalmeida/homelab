# Fase 13 — Atualização automática no app

Status: pendente (planejada; depende da fase 12)

## Objetivo
Avisar o usuário quando sai uma versão nova e atualizar sem baixar tudo de novo: só a diferença, por baixo dos panos.

## Como funciona (`electron-updater`)
- O `electron-builder` já publica, junto com o `.exe`, o `latest.yml` (versão, arquivo, SHA-512) e o `.blockmap` (blocos do instalador). A fase 12 anexa esses arquivos ao Release.
- No app, o `electron-updater` consulta o Release mais recente do repositório (`provider: github`), compara com a versão instalada e, havendo versão nova, baixa **só os blocos que mudaram** (atualização diferencial do NSIS). O restante vem do instalador antigo.
- Os dados do usuário (`userData`, biblioteca, modelos e pacote CUDA em `components/`) **não** são tocados: nada que o assistente de instalação baixou precisa ser baixado de novo.
- Windows apenas, instalação NSIS (a atual). Instalação por usuário, então não pede administrador.

## Escopo
- **Main:** `src/main/updater.ts` com uma classe `AppUpdater` (sem importar o Electron; dependências injetadas, como `SystemNotifier`): verifica ao abrir (depois da janela pronta) e a cada 6 horas; `autoDownload` ligado; `autoInstallOnAppQuit` ligado. Estados: `idle`, `checking`, `available`, `downloading` (com progresso), `ready`, `error`. Falha de rede nunca atrapalha o app.
- **IPC** (`docs/ipc-canais.md`): `updates:status`, `updates:check`, `updates:install` (reinicia e instala), evento `updates:progress` com o estado. O renderer só envia ids/comandos; URLs e versões ficam no main.
- **Interface:**
  - cartão na barra lateral, acima de Configurações (ao lado do de componentes): "Atualização 0.2.0 disponível", barra de progresso do download e botão "Reiniciar e atualizar" quando pronta (mesma linguagem do `SidebarSetupProgress`);
  - Configurações > **Sobre e atualizações** (grupo Sistema): versão atual, "Verificar agora", notas da versão (o texto do Release) e a opção de verificar automaticamente (ligada);
  - notificação do sistema quando a atualização está pronta e o app está em segundo plano (`SystemNotifier`).
- **Segurança:** a integridade é conferida pelo SHA-512 do `latest.yml`; sem assinatura de código não há verificação de editor (o aviso do SmartScreen continua). Só aceita atualização do repositório configurado; nunca instala sem a ação do usuário ou o fechamento do app.
- **Preferências:** `settings.json` ganha `updates.autoCheck` (padrão `true`); validação no `settings-validator`.
- **Docs:** `docs/atualizacoes.md` novo, `empacotamento.md` (bloco `publish` do `electron-builder.yml`), `ipc-canais.md`, `configuracoes.md`.
- Fora do escopo: canal beta, reversão de versão, atualização de Linux e macOS, assinatura de código.

## Testes
- `AppUpdater` com `electron-updater` falso: cada estado, progresso, erro de rede engolido, verificação periódica, `autoCheck` desligado não verifica, `install` só quando `ready`.
- Handler com `FakeIpcMain`; validador de settings.
- Renderer (Vitest): cartão da barra lateral em cada estado, seção Sobre e atualizações, ação "Reiniciar e atualizar".
- Não chamar a rede nos testes.

## O que testar
1. Instalar a versão `N`, publicar a `N+1` pelo fluxo da fase 12. Abrir a `N`: aparece o cartão de atualização e o download avança sem travar o app.
2. Conferir no download que o tráfego é bem menor que o instalador inteiro (atualização diferencial).
3. Clicar em "Reiniciar e atualizar": o app reabre na versão `N+1` com biblioteca, conversas, chave do Gemini e modelos intactos, sem o assistente de instalação reaparecer.
4. Sem internet, abrir o app: nenhum erro na tela; "Verificar agora" mostra a falha com clareza.
5. Desligar a verificação automática e reabrir: nada é consultado.

## Critério de aceite
Uma versão publicada chega a quem já instalou, com aviso na tela, baixando só a diferença e sem perder nada.

## Riscos e decisões a tomar
- Sem assinatura de código, o SmartScreen pode avisar de novo após a atualização.
- Na primeira versão com o atualizador, quem está em versão anterior precisa instalar na mão uma vez.
- Releases de componentes (`components-vN`) e de binários (`bin-vN`) não podem ser tratados como "último Release" do app: o atualizador deve filtrar por tags `v*` (ou marcá-los como pré-lançamento, como já é feito com `components-v1`).
