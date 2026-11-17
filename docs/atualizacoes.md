# Atualização do app

O app confere o GitHub por versão nova, avisa na barra lateral e, quando o usuário pede, baixa o instalador e o aplica. Não há servidor nosso: a fonte é a lista de Releases do repositório público (`UPDATE_REPOSITORY` em `src/updates/release-source.ts`).

## Fluxo para o usuário
1. Ao abrir (15 s depois da janela) e a cada 6 horas, o main consulta os Releases. Também dá para consultar na hora em **Configurações > Atualizações > Verificar agora**.
2. Havendo versão maior que a instalada: cartão **"Atualização X disponível"** na barra lateral, acima de Configurações (e uma notificação do sistema, uma vez por versão, se o app estiver em segundo plano).
3. Clicar no cartão abre **Configurações > Atualizações**: versão instalada, última verificação, novidades da versão (o texto do Release, em Markdown) e o botão **Baixar e atualizar**.
4. O botão pede confirmação (o app fecha e as tarefas em andamento são interrompidas), baixa o instalador com barra de progresso (no cartão e na seção), confere o checksum, abre o instalador em modo silencioso e fecha o app. O instalador troca os arquivos e abre o HomeLab de novo.
5. Biblioteca, conversas, configurações, chaves e componentes baixados (modelos, pacote CUDA) ficam em `Documentos/HomeLab` e `userData`, fora da pasta de instalação: **nada é tocado**.

Falha de rede nunca atrapalha o app: a seção mostra "Não foi possível verificar as atualizações" e o estado volta ao que era. Falha no download volta a "disponível", com a mensagem, e dá para tentar de novo.

## Como o main decide (sem Electron nas classes)
- `GitHubReleaseSource` lista `releases?per_page=30` e escolhe a **maior versão pelo SemVer** entre os Releases que não são rascunho nem pré-lançamento e cuja tag é `v<major>.<minor>.<patch>`. Releases de componentes (`components-vN`) e de binários (`bin-vN`) não contam. O instalador é o asset `HomeLab-Setup-<versão>.exe`, só aceito se o endereço for `https://github.com/...`.
- **Integridade:** o SHA-256 vem do campo `digest` que o GitHub calcula para cada asset. Sem `digest` o app **recusa** instalar ("não traz a verificação de integridade"); com checksum diferente, o arquivo é apagado ("arquivo corrompido"). O download reaproveita `downloadVerified` (`src/components/downloader.ts`): em fluxo, grava em `.part` e só vira o arquivo final depois de conferido.
- `AppUpdater` (`src/updates/app-updater.ts`): estados `idle`, `checking`, `available`, `downloading`, `installing`; `error` é um texto à parte (o estado volta ao que era). Não faz duas coisas ao mesmo tempo. Só mensagens do downloader (já em português) chegam ao usuário; erro de disco ou de sistema vira "Não foi possível baixar a atualização".
- `windows-installer.ts`: baixa para `userData/updates/<arquivo>` (apaga os anteriores e usa só o nome do arquivo) e abre o instalador desligado do app com `/S --updated --force-run` (NSIS do `electron-builder`: silencioso, reabre o app ao terminar), depois fecha o app. Se o instalador não abrir, o app **não** fecha.
- `main/app-updater-factory.ts` junta tudo com `net.fetch` do Electron (segue os redirecionamentos do GitHub). **Só o Windows aplica sozinho** (`canInstall`); nos outros sistemas o botão vira "Ver a versão no navegador" e abre o Release.
- `HOMELAB_UPDATES=off` desliga a verificação automática (os testes E2E usam). A manual continua funcionando.

## IPC
Canais `updates:status`, `updates:check`, `updates:install` e o evento `updates:changed` (o `UpdateStatus` inteiro a cada passo). Ver `ipc-canais.md`. O renderer só pede ações; endereços e checksums ficam no main.

## Renderer
`useUpdateStatus` (cache do TanStack Query alimentado pelo evento), `SidebarUpdateNotice` (cartão; some nas Configurações, que mostram o mesmo na tela) e `UpdatesSection` (grupo Sistema do menu). Textos em `lib/update-text.ts`.

## Para um release ser atualizável
- Tag `v<versão>` (SemVer) e Release **publicado** (nem rascunho, nem pré-lançamento).
- Instalador anexado com o nome `HomeLab-Setup-<versão>.exe` (é o `artifactName` do `electron-builder.yml`). Sem CI (fase 12), anexe à mão depois de `npm run dist`.
- `package.json` com a versão do Release (o app compara com `app.getVersion()`).

## Limites desta primeira versão
- Baixa o instalador inteiro (sem atualização diferencial) e não há opção para desligar a verificação automática.
- Sem assinatura de código: o SmartScreen pode avisar de novo depois da atualização.
- Quem está numa versão **anterior** a esta precisa instalar a atualização na mão uma vez.
- O repositório precisa continuar público (a API do GitHub é consultada sem token; o limite é de 60 consultas por hora por IP, e o app faz poucas).
