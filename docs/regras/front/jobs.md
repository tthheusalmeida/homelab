# Jobs (`pages/jobs`)

## Criar (`/jobs/create`)
- Busca os tipos em `GET /jobs/types`. Carregando: "Carregando". Erro: "Oops! houve uma falha ao carregar os tipos de jobs."
- Cada tipo vira um cartão (label, descrição e botão "Criar"). Clicar abre um diálogo com o formulário do tipo; fechar o diálogo limpa a seleção.
- `JobForm` escolhe o formulário pelo `type`: `video-to-transcript` → transcrição; `video-to-summary` → resumo; tipo desconhecido → nada.

### Links dos vídeos e lote (nos dois formulários)
- O campo **Links dos vídeos** (`VideoUrlField`, obrigatório) é um campo de uma linha mais o botão **Adicionar**. **Cada link colado entra na lista logo abaixo** (colar vários de uma vez, separados por linha ou espaço, adiciona todos); digitado, entra com **Enter** ou **Adicionar**. Repetidos são ignorados ("Esse link já está na lista." / "N links repetidos foram ignorados."); o que não for `http://` ou `https://` fica no campo com "Informe um link que comece com http:// ou https://." e não entra. Um link válido que só está no campo (sem Enter) também conta ao clicar em criar.
- **Lista de links** (`LinkList`): cada link é uma linha numerada com o **site em destaque** e o resto do endereço discreto (o link inteiro no `title`), com **Editar** (volta ao campo, com foco, para corrigir) e **Remover**. Mostra no máximo **5**; passando disso aparece um contador "+N links" com **Ver todos** / **Mostrar menos**, que abre o resto numa lista com rolagem (altura máxima), com a numeração seguindo. Abaixo, "N de 50 links" e **Limpar lista** (com mais de um link).
- **Links compridos nunca criam rolagem horizontal:** a linha corta o endereço com reticências (o link inteiro fica no `title`) e o corpo dos diálogos (`DialogBody`) tem coluna que encolhe, vale para qualquer formulário.
- Erros e avisos do campo (inválido, repetido, passou do limite, falha parcial) aparecem em `Callout` de destaque.
- Limite de **50 links** por pedido (`MAX_BATCH_LINKS`): ao colar além do limite entram só 50 e o campo avisa "Muitos links: o máximo é 50 por vez.".
- O botão mostra "Criar" com um link e "Criar N tarefas" com vários; fica desabilitado sem nenhum link, com texto inválido no campo, com links demais, ou enquanto cria. O estado fica em `useLinksField`.
- **Sem canal IPC novo:** o renderer chama o canal de criação existente uma vez por link, **em ordem** (`createVideoToTranscriptBatch` / `createVideoToSummaryBatch` em `api/create.ts`); a fila do back já roda um job por vez. Todas as opções (modelo, nível de detalhe, categoria, tags) valem para todos os links.
- **Título:** com vários links o título único não vale (o campo fica desabilitado, com a explicação **em destaque** num `Callout` âmbar: "Com vários links, cada documento usa o título padrão.") e não é enviado; cada documento recebe o título padrão do tipo. Com um link o título funciona como antes.
- **Falha parcial:** um link que falha não impede os outros. Se **todos** falham, vale o erro de sempre ("Não foi possível criar o job. Tente novamente."). Se só **parte** falha, a janela **não fecha**: os jobs criados já aparecem na fila, a lista passa a conter só os links que falharam e um aviso diz "X de N tarefas foram criadas. Os links abaixo falharam; revise e tente de novo." Mexer no campo limpa o aviso.

### Transcrição
- Envia `POST /jobs/video-to-transcript` com `{ url }` para cada link.
- Erro: "Não foi possível criar o job. Tente novamente."

### Dados do documento (nos dois formulários)
- Abaixo dos links há o bloco opcional **"Dados da página (opcional)"**, **recolhido por padrão** (`JobDocumentFields`, com `#ui/collapsible`; o cabeçalho mostra "preenchido" se algo foi digitado, para o formulário não crescer com vários links). Dentro (`DocumentFields`): título, categoria (até 4 níveis, com as categorias já existentes como sugestão) e tags. Texto explica que o que for preenchido já vem pronto na Classificação e pode ser ajustado ao adicionar à biblioteca.
- O título vazio mostra o padrão como dica ("Se vazio: Transcrição de vídeo" / "Se vazio: Resumo de vídeo").
- O envio inclui `title`, `category` e `tags` **somente se preenchidos** (título aparado, níveis em branco descartados); vazios ficam de fora do corpo da requisição. Campos ficam desabilitados durante a criação.
- O diálogo de criação tem altura máxima de 90% da tela e rola por dentro.
- **Ao criar o job com sucesso, a janela fecha e o formulário é descartado**: a próxima abertura começa limpa (links, título, categoria, tags e modelo vazios). Assim não há como criar dois jobs iguais reenviando o mesmo formulário. Antes de fechar, o formulário já fica travado (campos e botão desabilitados) e ignora novos envios; se a criação falhar, a janela continua aberta e editável, com o erro. Depois de fechar, a tela Criar mostra o aviso "Job criado: <tipo>" com o botão "Acompanhar" (vai para `/jobs/track`) e "Dispensar"; o aviso some ao abrir outro tipo.

### Resumo
- Além dos links, exige provider, modelo e thinking (reaproveita os selects do chat). Sem os três escolhidos o botão fica desabilitado e nada é enviado.
- Trocar provider limpa modelo e thinking; trocar modelo limpa thinking. **Aqui não há valor padrão**: o usuário precisa escolher.
- **Nível de detalhe** (select, padrão **Detalhado**): Resumo curto, Detalhado (mantém conceitos, explicações, comandos e exemplos) e Estudo completo (material de consulta organizado; aulas longas são resumidas em partes). Uma frase abaixo do select descreve o nível escolhido.
- Envia `POST /jobs/video-to-summary` com `{ url, providerId, modelId, thinking, detail }` para cada link (mais título, categoria e tags se preenchidos; título só com um link).
- Durante a criação, campos e botão ficam desabilitados.

## Resumo de PDF (Nova tarefa)
- O tipo "Resumo de PDF" vem de `jobs:types` como os outros; o formulário (`PdfToSummaryForm`) tem o botão **Escolher PDF** (só `.pdf`, até 50 MB e 1500 páginas), mostra a leitura com barra de progresso e **Cancelar leitura** e, pronta a leitura, nome, tamanho, páginas, estimativa de tokens, partes, chamadas à IA e os avisos (`Callout`, `warning` ou `info`).
- Depois do arquivo aparecem a IA (provedor, modelo, raciocínio), o nível de detalhe, os dados opcionais da página (título padrão: o nome do arquivo) e o aviso de **para onde o texto vai** (Gemini: serviço externo; Ollama: no computador). O botão **Criar resumo do PDF** só habilita com arquivo lido e IA escolhida; depois de criar, tudo trava (não cria o job duas vezes).
- Erro de leitura (senha, sem texto, grande demais...) vira o alerta do rodapé com a mensagem do main.

## Em andamento (`/jobs/track`, antes "Acompanhar"; o item do menu mostra um contador com os jobs na fila ou rodando)
- Busca `GET /jobs` a cada **1 s**. Carregando: "Carregando". Erro: "Oops! houve uma falha ao carregar os jobs."
- Lista ordenada do **mais novo para o mais antigo** (por `createdAt`), sem alterar o array original.
- Cada item mostra label, id, status, "Criado em" (data e hora pt-BR) e, ao expandir, o fluxo.
- **Duração**: só aparece com `startedAt` e `completedAt`; formatada como `ms/s/m/h`.

### Resumo de PDF que parou e arquivos temporários
- Resumo de PDF falho ou interrompido mostra **"N de M partes já estão salvas em disco"** (barra fina) e, além de **Tentar de novo** (mesmo modelo), o botão **Trocar modelo** (também nos resumos de vídeo que falharam): abre uma janela para escolher outra IA e continua de onde parou, sem refazer as partes prontas.
- **Limpar arquivos temporários** (cabeçalho, sempre visível): mede o que processos não terminados deixaram (progresso de PDF, vídeos e áudios temporários), mostra a quantidade e o tamanho e só apaga depois de confirmar, avisando que resumos de PDF parados não poderão mais ser continuados. Não mexe em processos em andamento nem nos documentos gerados.

### Status (badge)
- `pending` "Pendente", `running` "Em execução" (ícone girando), `completed` "Concluído" (verde), `failed` "Falhou" (destrutivo).

### Fluxo (`JobFlow`)
- Três fases: Pendente → Processando → Concluído.
- Job `completed`: todas as fases concluídas. Job `failed`: todas marcadas como falha.
- Caso contrário: a fase igual ao status do job fica ativa, as anteriores concluídas, as seguintes pendentes.
- As etapas detalhadas do job aparecem sob "Processando" sempre que o job tem etapas (independe do status).
- Etapa `completed` = concluída, `running` = ativa (girando), `failed` = falha, qualquer outra = pendente.
