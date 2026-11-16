# Persistência, backup e menos configuração

Status: **implementado** (ver "Como ficou" no fim; o smoke E2E fica para o usuário validar)

> Trabalho **avulso**: não é uma fase, não entra em `docs/fases` nem na tabela de `migracao.md`. Será feito **antes da fase 10** (o empacotamento fixa caminhos e formatos de arquivo). Aqui o escopo de produto *cresce* de propósito (a regra "só migrar" das fases não vale), por pedido do usuário.

## Objetivo
1. Nada que o usuário produz ou consulta se perde ao fechar o app: **histórico de jobs** e **conversas do chat** ficam em disco.
2. **Menos configuração, menos atrito:** o app funciona com padrões; o usuário só escolhe onde ficam as **páginas e livros** (a biblioteca).
3. **Backup e restauração dentro do app** (Configurações), em um único `.zip`, com escolha do que entra, tamanho estimado, progresso e aviso do que fica de fora.
4. Telas novas: excluir jobs (escolhidos ou todos), **seção de Chats** com várias conversas e aviso de contexto grande.

## Como está hoje
| Dado | Onde | Persiste? |
|---|---|---|
| Jobs (status, etapas, erro, datas, dicas do documento) | `InMemoryJobRepository` (`Map`) | Não |
| Conversa do chat | `useState` em `useAiChat`; o back é sem estado (`AIService.chat` recebe **uma** mensagem) | Não |
| Índice da biblioteca | `LibraryIndex` (`Map`) | Não, mas é cache reconstruído dos `.md` (**não muda**) |
| Páginas (`.md`) e livros (`books/<id>.json`, **dentro da pasta da biblioteca**) | `settings.paths.libraryDir` | Sim |
| Inbox e temporários | `settings.paths.inboxDir`, `videoTempDir`, `audioTempDir` | Sim |
| Configurações / segredos | `userData/settings.json`, `userData/secrets.json` | Sim |
| Consumo de IA | `userData/ai-usage.json` (limite de 5.000 registros) | Sim |
| Aparência | `localStorage` + `settings.json` (duplicada) | Sim |
| Layout do livro (`homelab.book-layout`) | `localStorage` | Sim (preferência de tela) |

## Estrutura nova

```
Documentos/HomeLab/                  raiz FIXA (não é configurável)
├─ library/                          páginas e livros (único caminho configurável; este é o padrão)
├─ inbox/                            documentos pendentes gerados pelos jobs
├─ data/
│  ├─ jobs.json                      histórico de jobs
│  ├─ chats.json                     todas as conversas
│  └─ ai-usage.json                  consumo de IA (move de userData)
├─ config/
│  └─ settings.json                  configurações (move de userData)
└─ temp/{video,audio}/               temporários (nunca entram no backup)
```

- **Um JSON por assunto** (`jobs.json`, `chats.json`), não um arquivo por item. Por quê é seguro: o app lê tudo na abertura e regrava o arquivo a cada mudança; texto puro, mesmo com centenas de jobs e chats, são poucos MB. Proteções: escrita **atômica** (grava `.tmp` e renomeia, como o `JsonFile` atual), `version` no arquivo e uma cópia `.bak` da última versão boa; arquivo ilegível vai para `.corrupt` e o app abre com o `.bak`. Se um dia ficar pesado, essa decisão é revista (a `JobRepository` já esconde o armazenamento).
- **Fora da raiz, em `userData`:** `secrets.json` (chave do Gemini, cifrada pelo `safeStorage` com chave do usuário do sistema, **não portável**), `localStorage` (preferências de tela) e arquivos do Chromium.
- A raiz é **fixa** porque só a **biblioteca** pode mudar de lugar (ver abaixo). Sem ponteiro `root.json`, sem pasta de dados configurável.
- `HOMELAB_DATA_ROOT_DIR` (só desenvolvimento e testes) troca a raiz, para o E2E e os testes **não escreverem nos Documentos reais**.

## Configurações: menos campos
Hoje a janela expõe 4 pastas, a pasta do Whisper, o executável e o modelo. Passa a ser:

| Fica | Sai da tela (vira padrão fixo) |
|---|---|
| **Pasta da biblioteca** (seletor; padrão `Documentos/HomeLab/library`) | Pasta da inbox, dos temporários de vídeo e de áudio |
| Aparência (tema e cor) | Pasta, executável e modelo do Whisper (padrão: `resources/bin/<plataforma>`, `whisper-cli(.exe)`, `ggml-large-v3-turbo.bin`) |
| Chave do Gemini (testar/salvar) | |
| URL do Ollama (padrão `http://localhost:11434`) | |
| Status dos serviços locais (Whisper, Ollama, ffmpeg: só teste) | |
| **Backup** (novo, ver abaixo) | |

- **Trocar a pasta da biblioteca não pode "perder" os documentos** (a nova pasta é vazia e o índice é montado a partir dos arquivos dela). Ao escolher outra pasta, o app pergunta, conforme o destino:
  - **Destino vazio ou novo:** "Mover a biblioteca atual para cá" (marcado) ou "Começar com a biblioteca vazia".
  - **Destino que já tem uma biblioteca** (outra máquina, backup restaurado à mão): "Usar esta pasta" (a atual fica onde está).
  - Mover = **copiar com progresso, conferir (contagem e tamanho), trocar a pasta, reindexar e reiniciar**. Páginas e livros vão juntos (os livros ficam dentro da biblioteca). A pasta antiga **só é apagada** se o usuário marcar "Apagar a pasta antiga depois de mover" (desmarcado por padrão). Falha no meio: nada troca e o app avisa.
- Quem hoje tem Whisper em outra pasta (ex.: `D:/homelab/ai/whisper`) passa a colocar os arquivos em `resources/bin/<plataforma>` (já documentado em `resources/bin/README.md`).
- `settings.json` guarda só biblioteca, aparência e Ollama; valores antigos de pastas/Whisper no arquivo são ignorados.

## O que é "migração"
Hoje seus dados estão em pastas soltas (`D:\homelab\lib`, `D:/homelab/temp/docs`...) e os arquivos de estado em `userData`; a estrutura nova junta tudo na raiz fixa. "Migração" é **levar o que já existe para o lugar novo**. Ela usa a **mesma rotina de mover a biblioteca** que o usuário terá ao trocar a pasta nas Configurações (`LibraryMover`), então não é código descartável:
- **Biblioteca (páginas e livros):** movida de `D:\homelab\lib` para `Documentos/HomeLab/library` (ou para a pasta que você escolher), copiando, conferindo e reindexando.
- **Inbox, `ai-usage.json` e `settings.json`:** copiados para a estrutura nova.
- Em todos os casos o app **pede confirmação** e **não apaga a origem** sem você marcar a opção; só você decide apagar `D:\homelab\lib` depois de conferir.
- A etapa que lê o **formato antigo** (caminhos soltos e `userData`) é a única parte temporária e sai do código depois. Jobs e chats antigos não existem em disco, então não há o que migrar.

## Parte A. Raiz e configuração
- `DataPaths` (main): resolve as pastas da raiz fixa + `libraryDir` vindo do `settings.json`; `BackConfig` ganha `dataDir`. `settings.paths` fica só com `libraryDir`.
- Tela de Configurações enxuta (tabela acima). Whisper e pastas internas deixam de ser validados na UI.
- `LibraryMover` (copiar com progresso, conferir, trocar, reindexar) e a migração do formato antigo, que o reutiliza (seção anterior).
- Arquivo de estado compartilhado: `JsonFile` com `.bak` (usado por jobs, chats, uso e settings).

## Parte B. Jobs persistidos e excluíveis
**Persistência**
- `FileJobRepository` (um `jobs.json`) no lugar do `InMemoryJobRepository`; a interface `JobRepository` já existe e o `JobRunner` já chama `save` a cada transição. Ganha `delete(ids)`.
- `Job` ganha snapshot e `Job.restore(snapshot)`: id, nome, status, etapas, datas, erro **e `documentHints`**. Histórico **sem limite**.
- **Ao iniciar**, job `pending` ou `running` encontrado em disco vira `failed` ("Interrompido ao fechar o app") e a etapa em andamento vira `failed`; o app avisa "N processos foram interrompidos" (ver Avisos).
- Excluir um job **não apaga** os documentos que ele gerou.

**Exclusão**
- Canais: `jobs:delete` (`{ ids }`) e `jobs:delete-all`. Resposta: `{ deleted, skipped: { id, reason: 'ACTIVE' | 'NOT_FOUND' }[] }`.
- Job `pending`/`running` **não é excluído** (`ACTIVE`); "excluir todos" apaga todos menos os ativos e informa quantos ficaram.
- UI (Jobs → Acompanhar): modo de seleção, "Selecionar todos", **Excluir selecionados**, **Excluir todos**, com diálogo de confirmação ("N processos serão excluídos do histórico; os documentos gerados continuam na biblioteca"). Reutilizar `ui/` e `components/`. O polling de 1 s não pode perder a seleção nem ressuscitar itens excluídos.

**Ações nos jobs (cancelar, tentar de novo, desfazer)**
- Canais `jobs:cancel`, `jobs:retry` e `jobs:undo-delete` (ver `docs/ipc-canais.md`). Cancelar é cooperativo: para ao fim da etapa em andamento.
- Na tela Em andamento: botão **Cancelar** nos jobs ativos, **Tentar de novo** nos que falharam (e guardam `request`), linha ao vivo com **etapa n/total, nome da etapa e tempo decorrido**, e **Desfazer** no snackbar depois de excluir.

## Parte C. Seção de Chats
**Modelo** (em `chats.json`)
```
{ version: 1, chats: [{ id, title, createdAt, updatedAt,
    providerId, modelId, thinking?,
    messages: [{ id, role: 'user' | 'assistant', content, createdAt }] }] }
```
- Título = primeira mensagem (espaços normalizados, até 60 caracteres). Provedor, modelo e raciocínio do último envio ficam gravados no chat. Renomear fica fora de escopo.

**Contexto**
- A cada envio, o main junta a nova mensagem ao histórico e manda o **histórico inteiro** ao provedor (mais tokens, como combinado).
- Back: `AIChatRequest` ganha `messages?: { role, content }[]`. Gemini monta `contents` com papéis `user`/`model`; Ollama manda a lista em `/api/chat`. Sem `messages`, tudo como hoje (os **jobs de resumo não mudam**). O consumo de IA continua por resposta.
- **Ollama:** o padrão do Ollama é um contexto pequeno (`num_ctx`) e ele **descarta o começo da conversa sem avisar**. Para o histórico valer, o provider passa `options.num_ctx` suficiente para o histórico (limitado ao máximo do modelo).

**Aviso de contexto grande (antes de enviar)**
- O composer mostra uma estimativa discreta ("~12 mil tokens no contexto", `caracteres ÷ 4`, rotulada como estimativa).
- Se a estimativa do histórico **+ a nova mensagem** passar de **80% do limite do modelo** (Gemini: `inputTokenLimit` da lista de modelos; Ollama: contexto do modelo), ou de **100 mil tokens** quando o limite for desconhecido, o app **pergunta antes de enviar**: "Esta conversa está grande (~N tokens, X% do limite do modelo) e cada envio consome muito. Enviar mesmo assim ou começar um chat novo?". Nada é cortado automaticamente.

**Canais**
- `chats:list`, `chats:get` (`{ id }`), `chats:create`, `chats:delete` (`{ id }`).
- `chat:send` muda: `{ chatId, message, modelId, providerId, thinking? }` → `{ message, chat }`. Pergunta e resposta só são gravadas **juntas, em caso de sucesso**; em falha o chat não muda, a UI mostra o erro e devolve o texto ao campo.
- `chat:cancel` (`{ chatId }`): o main **descarta** a resposta quando chegar (a chamada ao provedor não é interrompida; os tokens são gastos). Um envio por chat por vez.

**UI**
- Seção **Chats** (rota `/ai/chat/:chatId?`): lista à esquerda (mais recente primeiro), **Novo chat** e excluir por item com confirmação; conversa e composer à direita. Chat vazio só é gravado ao enviar a primeira mensagem. Reutilizar `ChatMessageList`, `ChatComposer`, `ChatSettings`.

## Parte D. Backup e restauração (Configurações → Backup)

**Fazer backup**
1. O app lista o que dá para incluir, cada item com caixa de seleção e tamanho: **Biblioteca (páginas e livros)**, **Inbox**, **Jobs**, **Chats**, **Consumo de IA**, **Aparência e configurações**.
2. Mostra o **tamanho original** (soma dos arquivos, imediato) e o **tamanho estimado do `.zip`** (rotulado como estimativa, pois só a compactação real dá o número exato).
3. Mostra o aviso **"O que NÃO entra no backup"**: chave do Gemini e outras chaves (segredos), arquivos temporários de vídeo e áudio, binários e modelos do Whisper, modelos do Ollama, preferências de tela do navegador interno (ex.: layout dos livros) e o caminho da pasta da biblioteca (é da máquina).
4. O usuário escolhe onde salvar o `.zip` (diálogo nativo de salvar). **Barra de progresso** (arquivos processados / total, percentual) e botão **Cancelar** (o zip parcial é apagado).
5. Ao final: "Backup criado" com o tamanho real e o caminho; em falha, aviso claro e nenhum arquivo parcial fica.

**Restaurar**
1. O usuário escolhe o `.zip` (diálogo nativo de abrir). O app lê só o `manifest.json` do zip (versão do app, data, itens, contagens, tamanhos) e **mostra o conteúdo antes de aplicar**, com caixa de seleção por item. Zip inválido, de versão futura ou sem manifesto é recusado com mensagem clara.
2. **O usuário escolhe o modo na tela** (Mesclar já vem marcado):
   - **Mesclar (padrão, não destrutivo):** adiciona o que não existe e **mantém o atual** quando o item já existe (mesmo arquivo na biblioteca, mesmo id em jobs/chats).
   - **Substituir:** troca os itens selecionados pelos do backup, com confirmação explícita.
3. **Segurança:** extrai primeiro para uma pasta temporária e valida (sem caminhos que saiam da pasta, o chamado zip-slip; só tipos e nomes esperados); só então aplica. Antes de **Substituir**, cria sozinho uma cópia de segurança dos itens afetados; se algo falhar no meio, **desfaz** e avisa.
4. Páginas e livros vão para a **pasta da biblioteca configurada nesta máquina**; o app reindexa. Jobs, chats, uso e configurações são recarregados reiniciando o app (botão "Reiniciar agora" ao final).
5. A chave do Gemini precisa ser digitada de novo (aviso na tela final).

**Formato:** `homelab-backup-AAAA-MM-DD.zip` com `manifest.json` (`version`, `createdAt`, `appVersion`, `items`), `library/` (páginas e `books/`), `inbox/`, `data/`, `config/`.

**Implementação**
- **Zip: biblioteca JavaScript, não ferramenta do sistema.** Não há zip nativo uniforme: o Node só tem `zlib` (gzip/deflate, sem formato zip) e o Electron não oferece zip. Cada sistema teria um caminho: no Windows o `tar.exe` (bsdtar, testado aqui) gera zip, o macOS tem `zip`/`ditto`, e o Linux **pode não ter** `zip` instalado. Além disso, programas externos não dão progresso por arquivo, não deixam ler só o `manifest.json` e dificultam a validação contra zip-slip.
- **Escolha: `yazl` (criar) + `yauzl` (ler)**, JavaScript puro, sem módulo nativo (funciona igual em Windows, macOS e Linux e empacota sem rebuild), ~170 KB no total e só duas dependências pequenas (`buffer-crc32`, `pend`). Leem e gravam por **streaming** (não carregam a biblioteca na memória) e permitem contar arquivo a arquivo, o que alimenta o progresso. `yauzl` está ativo (3.4.0, jun/2026). Descartados: `adm-zip` (carrega tudo em memória), `archiver` (9 dependências) e `fflate` (mais pesado e menos adequado a streaming de disco).
- **Canal de eventos (main → renderer), pequeno e reutilizável.** Hoje a ponte só tem `invoke`. Adicionar eventos custa pouco e serve a mais do que o backup:
  - `shared/events.ts`: `IpcEvents` (nomes) + contratos de payload, como `channels.ts`; lista própria de eventos permitidos.
  - Preload/ponte: `on(event, callback)` devolve a função de cancelar; só eventos da lista passam e o callback recebe **só o payload** (nunca o objeto de evento do Electron).
  - Main: porta `EventPublisher.publish(event, payload)` (a implementação envia às janelas abertas com `webContents.send`; nos testes, um fake). Os handlers a recebem como as outras portas.
  - Renderer: hook `useIpcEvent(event, handler)`; o mock de `window.api` em `#test` ganha `on`.
  - **Primeiros usos:** `backup:progress`, `library-move:progress` e o aviso de job falho/interrompido (ver Avisos). Fica **de fora** trocar o polling de 1 s dos jobs por eventos (seria melhoria à parte).
  - **Alternativa sem eventos:** o renderer consultar `backup:status` a cada ~500 ms, como os jobs fazem hoje. Funciona, mas é menos fluido e cada novo aviso global exigiria mais polling; por isso a recomendação é o canal de eventos.
- Diálogos nativos de salvar/abrir arquivo no main (já existe o seletor de pasta).
- Canais: `backup:preview` (itens e tamanhos), `backup:create`, `backup:cancel`, `backup:inspect` (lê o manifesto), `backup:restore`; evento `backup:progress`. Mover biblioteca: `library:move` + evento `library-move:progress`.

## Avisos ao usuário (falhas e situações importantes)
Nada falha em silêncio. Um aviso único (snackbar com "ver detalhes" para erros) cobre:
- **Job que termina ou falha** com o usuário em outra tela: aviso com link para Jobs.
- **Processos interrompidos ao fechar o app**, na abertura.
- **Falha ao gravar em disco** (disco cheio, arquivo em uso, permissão): novo código `PERSIST_FAILED`; o chat e o job não fingem que salvaram.
- **Falha no backup ou na restauração**: o que aconteceu, que nada foi aplicado (ou o que foi desfeito) e o que fazer.
- **Falha no envio do chat**: erro do provedor mostrado e texto devolvido ao campo.
- **Contexto grande**: aviso antes do envio (Parte C).
- **Arquivo de estado corrompido**: aviso de que a versão `.bak` foi usada.

## Fora de escopo
- Renomear, buscar, exportar chats; fixar ou arquivar; corte ou resumo automático de contexto.
- Retomar ou reexecutar jobs; apagar documentos gerados junto com o job.
- Backup automático/agendado e backup para nuvem (só manual, por arquivo).
- Backup da chave do Gemini.

## Testes unitários
- `DataPaths` e `settings`: raiz fixa, override por env, `libraryDir` padrão e personalizado; valores antigos de pastas/Whisper ignorados.
- `JsonFile` com `.bak`: escrita atômica, leitura do `.bak` quando o principal está corrompido.
- `LibraryMover`: destino vazio (move), destino com biblioteca (só usa), copia e confere, não apaga a origem sem a opção, falha no meio não troca nada, reindexa depois; a migração do formato antigo reaproveita a rotina.
- Canal de eventos: a ponte só entrega eventos permitidos, entrega só o payload, `on` devolve o cancelamento; `EventPublisher` envia a todas as janelas.
- `FileJobRepository`: grava a cada `save`, restaura tudo (com `documentHints`), `delete`, ordem; recuperação ao iniciar (`pending`/`running` → `failed`).
- `JobHandler`: `jobs:delete` (válidos, inexistentes, ativos) e `jobs:delete-all`.
- `ChatStore`/`ChatService`: criar, listar, enviar com histórico completo, falha não grava, cancelar descarta, excluir, título.
- Providers: com e sem `messages`; Ollama com `num_ctx`.
- Estimativa de tokens e regra do aviso (80% do limite, 100 mil sem limite conhecido).
- Backup: seleção de itens, tamanhos, manifesto, progresso, cancelar apaga parcial, nunca inclui segredos nem `temp`.
- Restauração: manifesto inválido/futuro, zip-slip rejeitado, mesclar mantém o existente, substituir cria cópia de segurança e desfaz em falha, reindexa a biblioteca.
- Renderer: seleção e exclusão de jobs; lista de chats; aviso de contexto; tela de Backup (itens, tamanhos, aviso do que não entra, progresso, restaurar com pré-visualização); Configurações enxuta.
- Smoke E2E: reiniciar mantém jobs e chats; backup e restauração de ponta a ponta com `userData` e raiz temporários.

## O que testar (roteiro para o usuário)
1. **Configurações enxutas:** só aparecem biblioteca, aparência, Gemini, Ollama, status dos serviços e Backup; sem seletores de pasta além da biblioteca.
2. **Migração dos dados atuais:** confirmar a mudança; páginas e livros aparecem como antes na pasta nova, inbox, consumo e configurações vieram junto e `D:\homelab\lib` continua intacta até você apagar.
3. **Trocar a pasta da biblioteca:** escolher uma pasta vazia e "Mover a biblioteca atual": progresso, reinício e tudo no lugar (páginas, livros, busca); escolher uma pasta que já tem biblioteca: "Usar esta pasta".
4. **Jobs:** criar um job, fechar e abrir o app: continua na lista. Fechar **durante** um job: ao abrir aparece falho ("Interrompido ao fechar o app") e o app avisa.
5. Selecionar 2 jobs e excluir; excluir todos (com um rodando, ele permanece e o aviso informa); documentos gerados continuam na biblioteca.
6. **Chats:** criar 2 chats, conversar, fechar e abrir: histórico volta; a segunda pergunta mostra que o modelo lembra da primeira. Excluir um chat; cancelar uma resposta e ver que não aparece ao reabrir; Ollama desligado: erro e texto de volta ao campo.
7. **Aviso de contexto:** em um chat longo (colar texto grande), o aviso de tamanho aparece **antes** do envio, com as opções de enviar ou abrir chat novo.
8. **Backup:** em Configurações → Backup, desmarcar um item (ex.: Chats), ver os tamanhos, o aviso do que não entra e o progresso; salvar o `.zip`; abrir o zip e conferir `manifest.json` e que **não** há chave nem `temp`. Cancelar no meio: nenhum zip parcial.
9. **Restaurar (mesclar):** restaurar o zip na mesma máquina: nada duplica e nada do atual é sobrescrito. **Restaurar (substituir)** depois de apagar um livro: o livro volta; apagar outro item e provocar falha (zip corrompido): aviso claro e dados intactos.
10. **Backup em máquina limpa** (ou com `HOMELAB_USER_DATA_DIR` novo): restaurar o zip traz páginas, livros, jobs e chats; a chave do Gemini precisa ser digitada de novo.
11. Provocar uma falha de gravação (pasta somente leitura): o app avisa em vez de falhar em silêncio.

## Riscos e decisões em aberto
- **Contexto longo:** histórico inteiro a cada envio; chats muito longos ficam caros ou estouram o limite. O aviso protege, mas não corta.
- **Cancelar não interrompe o provedor** (só descarta a resposta); interromper de verdade exigiria `AbortSignal` em Gemini e Ollama.
- **Tamanho do zip é estimativa:** o valor exato só existe depois de compactar; o aviso diz isso.
- **Biblioteca grande:** o backup lê todos os arquivos; por isso o streaming e o progresso.
- **Dependências novas** (`yazl`, `yauzl` e seus tipos): aprovadas pelo usuário; entram no empacotamento (JavaScript puro, sem rebuild por plataforma).
- **Whisper em caminho próprio deixa de existir na UI:** quem usa outra pasta precisa mover os arquivos para `resources/bin/<plataforma>`.

## Ordem sugerida de implementação (commits por assunto, só quando o usuário pedir)
1. `JsonFile` com `.bak`, `DataPaths` (raiz fixa) e `settings` enxuto; Configurações sem os campos que saíram.
2. Canal de eventos na ponte IPC (`IpcEvents`, `on`, `EventPublisher`, `useIpcEvent`) e diálogos nativos de arquivo.
3. `LibraryMover` (mover a biblioteca com progresso) e migração do formato antigo.
4. `FileJobRepository`, snapshot/restauração do `Job`, recuperação ao iniciar.
5. Exclusão de jobs (canais, handler, tela).
6. Chats: store, canais, histórico nos providers, `num_ctx`.
7. Chats: seção na interface e aviso de contexto grande.
8. Backup (criar) e restauração (inspecionar, mesclar, substituir).
9. Avisos centralizados (job falho, `PERSIST_FAILED`, etc.), docs (`arquitetura`, `configuracoes`, `ipc-canais`, `regras`) e smoke E2E.

## Como ficou (diferenças em relação ao rascunho)
- **Chat sem `chats:create`:** o `chatId` nasce na tela (uuid) e o chat é criado pelo main com a primeira mensagem (o doc previa um canal de criar). Cancelar é por `chat:cancel` com o `chatId`.
- **Restauração aplicada ao vivo:** jobs, chats e consumo entram pelos serviços em execução (`importSnapshots`, `importChats`, `importRecords`), então não precisa reiniciar (só quando o endereço do Ollama muda). Job que estava rodando no backup volta como interrompido.
- **Desfazer:** cada item aplicado registra como se desfaz (coleções voltam ao que eram, arquivos mesclados são removidos, pasta substituída volta da cópia de segurança); se algo falhar a restauração desfaz e avisa. Antes de **Substituir**, o app guarda o que havia em `temp/safety-<data>` (arquivos, coleções e configurações).
- **Mesclar não mexe nas configurações**; só **Substituir** aplica aparência e endereço do Ollama (nunca o caminho da biblioteca nem segredos).
- **Mover a biblioteca** e a **migração do formato antigo** usam a mesma rotina de cópia conferida (`storage/tree.ts`); a migração é a única parte temporária.
- **Avisos além do planejado:** processos interrompidos, arquivo recuperado da cópia `.bak` ou ilegível (jobs, chats e configurações), job que terminou, falha ao gravar o consumo de IA.
- **Contexto do Ollama:** o provider descobre o limite do modelo por `/api/show` e pede `num_ctx` suficiente para o histórico; o limite também alimenta o aviso de conversa grande (80% do limite, ou 100 mil tokens estimados quando desconhecido).
- Código novo: `src/storage`, `src/backup`, `src/ipc/event-publisher.ts`, `src/ipc/file-picker.ts`, `src/settings/{app-paths,library-mover}.ts`, `src/main/{legacy-migration,migration-prompt,notice-store,startup-notices,event-back-alerts}.ts`, `src/back/modules/{chat,jobs}` (repositórios em arquivo) e, no renderer, `components/{NoticeCenter,ProgressBar,TiltCard}`, `pages/ai/chat`, `pages/jobs/track` e `renderer/settings/src/sections/BackupSection.tsx`.
