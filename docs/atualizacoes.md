# Atualização do app

O app confere o GitHub por versão nova, avisa na barra lateral, **baixa só a diferença** sozinho (no Windows) e instala ao reiniciar ou ao fechar. Não há servidor nosso: a fonte é a lista de Releases do repositório público (`UPDATE_REPOSITORY` em `src/updates/release-source.ts`). Os Releases saem sozinhos da CI (`empacotamento.md`, `versionamento.md`).

## Fluxo para o usuário (Windows)
1. Ao abrir (15 s depois da janela) e a cada 6 horas, o main consulta os Releases, **se a verificação automática estiver ligada** (Configurações > Sobre). **Verificar agora** funciona sempre.
2. Havendo versão maior que a instalada, o app já **baixa em segundo plano só os blocos que mudaram** do instalador (atualização diferencial). A barra lateral mostra o cartão **"Atualização X disponível"** e, durante o download, a barra de progresso; o app continua usável.
3. Terminado o download, o cartão vira **"Atualização X pronta"** com o botão **Reiniciar e atualizar**, e o app avisa por notificação do sistema (uma vez por versão, se estiver em segundo plano).
4. **Reiniciar e atualizar** (pede confirmação, porque tarefas em andamento são interrompidas) fecha o app, instala em modo silencioso e abre o HomeLab de novo. Se o usuário não clicar, a versão baixada é instalada **sozinha quando ele fechar o app**.
5. Biblioteca, conversas, configurações, chaves e componentes baixados (modelos, pacote CUDA) ficam em `Documentos/HomeLab` e `userData`, fora da pasta de instalação: **nada é tocado**.

Falha de rede nunca atrapalha o app: a seção mostra "Não foi possível verificar as atualizações" e o estado volta ao que era. Se o download falhar, volta a "disponível" com a mensagem e o botão **Baixar atualização** tenta de novo. **No Linux** o app só avisa: o botão vira "Ver a versão no navegador" e abre o Release (o AppImage é baixado à mão).

**App não empacotado (execução de desenvolvimento, `npm run dev` ou `npm start`): não verifica atualizações.** Não agenda a verificação de abertura nem a periódica, "Verificar agora" não consulta o GitHub e a barra lateral nunca mostra o cartão; assim quem roda o código local não recebe "atualização disponível" de uma versão que já superou. `UpdateStatus.enabled` vem de `app.isPackaged` (`main/index.ts` → `createAppUpdater`); em Configurações > Sobre a seção mostra só a versão instalada e o aviso de que as atualizações são verificadas no app instalado, sem os botões de verificação nem a opção automática.

## Como funciona
- **Quem decide a versão:** `GitHubReleaseSource` lista `releases?per_page=30` e escolhe a **maior versão pelo SemVer** entre os Releases que não são rascunho nem pré-lançamento e cuja tag é `v<major>.<minor>.<patch>`. Releases de componentes (`components-vN`) e de binários (`bin-vN`) não contam. Dele vêm também as notas (o texto do Release, em Markdown) e a página da versão.
- **Quem baixa e instala:** o `electron-updater` (`src/main/electron-native-updater.ts`), atrás da porta `NativeUpdater` (`src/updates/native-updater.ts`). Para a versão escolhida o feed aponta para `https://github.com/<repo>/releases/download/v<versão>` (fixo no código: só aceita atualização do repositório do projeto), onde a CI anexa o `latest.yml` (versão e **SHA-512**) e o `.blockmap`. O `electron-updater` baixa só os blocos diferentes (compara com o `.blockmap` da versão instalada, que está no Release dela), confere o SHA-512 e instala com `/S --updated --force-run` (silencioso, reabre o app). `autoInstallOnAppQuit` fica ligado.
- **Integridade:** o SHA-512 do `latest.yml`. Sem `latest.yml` no Release, o app recusa ("Esta versão ainda não tem instalador para o seu sistema"). Sem assinatura de código não há verificação de editor (o SmartScreen pode avisar).
- `AppUpdater` (`src/updates/app-updater.ts`, sem Electron: tudo injetado): estados `idle`, `checking`, `available`, `downloading`, `ready`, `installing`; `error` é um texto à parte (o estado volta ao que era). Não faz duas coisas ao mesmo tempo; com a versão `ready`, novas verificações não fazem nada. Os erros do download viram uma mensagem genérica em português.
- `main/app-updater-factory.ts` junta tudo com `net.fetch` do Electron. O atualizador nativo só é criado no **Windows empacotado** (`process.platform === 'win32' && app.isPackaged`); senão é `null` e o app só avisa.
- **Verificação automática:** preferência `updates.autoCheck` (padrão ligada) no `settings.json` (`configuracoes.md`), alterada pelo canal `updates:set-auto-check`. Os temporizadores sempre rodam, mas cada disparo confere a preferência; ligar ou desligar vale na hora.
- `HOMELAB_UPDATES=off` impede o agendamento (os testes E2E usam). A verificação manual continua funcionando.

## Notas da versão em português (IA local)
As notas vêm do texto do Release no GitHub e saem em inglês (são as linhas dos commits). Em Configurações > Sobre, **se houver IA local**, o grupo "Novidades da versão" ganha o botão **Traduzir para português**:
- **Só com o Ollama ligado** e com ao menos um modelo de texto instalado (`updates:translation-available`, consultado toda vez que a seção abre). Sem IA local o botão não aparece e as notas ficam em inglês; nunca se usa IA externa (Gemini) para isso.
- **Usa o modelo mais barato:** o menor (em bytes) entre os modelos do Ollama que geram texto (modelos só de embeddings não entram), com o raciocínio desligado (`src/updates/release-notes-translator.ts`).
- **Loading:** o botão vira "Traduzindo…" com ícone girando e fica desabilitado até a resposta. Depois mostra a tradução com o aviso "Traduzido pela IA local; pode ter imprecisões" e o botão **Ver original** / **Ver tradução**. Falha mostra "Não foi possível traduzir" e deixa tentar de novo.
- A tradução fica em memória por versão (traduzir de novo não chama o modelo) e some ao fechar o app. O consumo aparece em Consumo como uso do Ollama, sem custo.

## IPC
Canais `updates:status`, `updates:check`, `updates:install`, `updates:set-auto-check`, `updates:translation-available`, `updates:translate-notes` e o evento `updates:changed` (o `UpdateStatus` inteiro a cada passo). Ver `ipc-canais.md`. O renderer só pede ações; endereços e checksums ficam no main.

## Renderer
`useUpdateStatus` (cache do TanStack Query alimentado pelo evento), `useCheckForUpdates`, `useInstallUpdate`, `useSetAutoCheck`, `useTranslationAvailable`, `useTranslateNotes`; `SidebarUpdateNotice` (cartão; some nas Configurações, que mostram o mesmo na tela) e `UpdatesSection` (Configurações > **Sobre**, grupo Sistema). Textos em `lib/update-text.ts`.

## Para um release ser atualizável
- Tag `v<versão>` (SemVer) e Release **publicado** (nem rascunho, nem pré-lançamento), marcado como o mais recente. Tudo isso a CI faz (`release.yml`).
- Anexos do Windows: `HomeLab-Setup-<versão>.exe`, `HomeLab-Setup-<versão>.exe.blockmap` e `latest.yml` (gerados pelo `electron-builder`, bloco `publish` do `electron-builder.yml`).
- `package.json` com a versão do Release no build (a CI injeta; o app compara com `app.getVersion()`).
- Para gerar na mão sem CI: `npm run dist:win` e anexar os três arquivos ao Release.

## Limites
- **Primeira versão com o atualizador novo:** quem está numa versão anterior (que baixava o instalador inteiro) atualiza pelo fluxo antigo uma vez; a partir daí, só a diferença. Quem está numa versão ainda mais antiga, sem atualizador, instala na mão.
- O download diferencial só aparece quando o `.blockmap` da versão instalada existe no Release dela (a CI de agora em diante anexa). Sem ele, o `electron-updater` baixa o instalador inteiro, o que funciona do mesmo jeito.
- Sem assinatura de código: o SmartScreen pode avisar de novo depois da atualização.
- O repositório precisa continuar público (a API do GitHub é consultada sem token; o limite é de 60 consultas por hora por IP, e o app faz poucas).
- O Linux não atualiza sozinho; canal beta e reversão de versão não existem.
