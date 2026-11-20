# Biblioteca (modules/library)

Fundação, armazenamento, índice, busca, operações e API.

## Documentos
- Todo conteúdo gerado ou escrito é um arquivo **Markdown (`.md`) com frontmatter YAML**. Não se usa mais `.txt`.
- Campos: `id`, `title`, `type`, `source`, `sourceUrl` (opcional), `status`, `category`, `tags`, `createdAt`, `updatedAt`.
- `type`: `summary` (Resumo), `transcription` (Transcrição) ou `article` (Criação). `source`: `video` ou `manual`.
- `id` é o id do job (uuidv7) e é a referência principal do documento.
- `category` é o caminho hierárquico, do mais amplo ao mais específico, com **0 a 4 níveis** (vazio enquanto pendente; de 1 a 4 para publicar).
- Strings são gravadas entre aspas (um id numérico não vira número); chaves em texto simples.
- Ler um arquivo sem frontmatter, com YAML inválido, campo obrigatório ausente, valor desconhecido, data inválida ou mais de 4 níveis dá erro descritivo.
- `tags` ficam em minúsculas, sem espaços nas pontas, sem vazias e sem duplicadas (ignorando acento e maiúscula).

## Ciclo de vida (`status`)
- `pending`: acabou de ser gerado por um job; fica na pasta `TEMP_DOCS_DIR` aguardando a decisão do usuário.
- `published`: está na biblioteca (`LIB_DIR`) e aparece nas buscas.
- `archived`: removido logicamente; o arquivo continua em `LIB_DIR`, mas não aparece na biblioteca e pode ser readicionado.
- Adicionar à biblioteca move o arquivo da entrada para `LIB_DIR` e o apaga da entrada. Só "descartar" apaga de verdade.

## Nome do arquivo
- Padrão `<slug>_<id>.md` (ex.: `praticas_da_primeira_maneira_01a1d993-....md`). O slug vem primeiro para o nome ordenar por tema.
- Slug: minúsculas, sem acentos, palavras separadas por `_`, no máximo 60 caracteres; título vazio vira `sem_titulo`.
- O id é tudo depois do último `_` (o uuid não tem `_`). Nome que não termina em `.md` ou sem slug/id é inválido.

## Categorias (nomes de pasta)
- Cada nível vira uma pasta em `LIB_DIR`. Acentos e espaços são mantidos; caracteres inválidos (`< > : " / \ | ? *` e de controle) são removidos; pontos e espaços nas pontas também.
- Rejeita nome vazio, só pontos, acima de 60 caracteres e nomes reservados do Windows (`CON`, `NUL`, `COM1`…). Isso impede escapar da pasta com `..`.
- Comparação de nomes ignora maiúscula, acento e espaços extras (para reaproveitar pasta existente).
- Ordenação alfanumérica natural em pt-BR: "Aula 2" antes de "Aula 10"; acentuadas junto da letra base.

## Armazenamento (`LibraryStorage`)
- Os arquivos `.md` são a fonte da verdade. Pendentes ficam em `TEMP_DOCS_DIR`; publicados e arquivados ficam em `LIB_DIR`, dentro das pastas da categoria (1 a 4 níveis).
- Gravar escolhe a pasta pelo `status`: pendente vai para a entrada; publicado e arquivado vão para a pasta da categoria. Publicar sem categoria, ou com mais de 4 níveis, dá erro.
- A pasta da categoria reaproveita uma já existente, mesmo com diferença de maiúscula, acento ou espaços; só cria quando não existe.
- A gravação é atômica: escreve em `.tmp` e renomeia. Arquivos que não terminam em `.md` são ignorados nas listagens.
- Gravar de novo o mesmo id e título sobrescreve o arquivo. Se o título muda, o nome muda; quem altera o título é responsável por apagar o arquivo antigo.
- Procurar por id usa só o nome do arquivo (não lê o conteúdo) e compara o id inteiro (`abc` não casa com `xabc`).
- Ler valida o frontmatter e exige que o id do nome do arquivo seja igual ao do frontmatter; erro cita o nome do arquivo.
- **A pasta manda na categoria:** ao ler um documento publicado ou arquivado de `LIB_DIR`, a categoria passa a ser o caminho de pastas onde o arquivo está (1 a 4 níveis válidos), mesmo que o frontmatter diga outra coisa. Assim mover o arquivo de pasta muda a categoria depois de reindexar. Arquivo direto na raiz de `LIB_DIR`, com mais de 4 níveis ou com nome de pasta inválido mantém a categoria do frontmatter; pendentes (entrada) nunca usam a pasta. O frontmatter não é reescrito: só é atualizado na próxima gravação (publicar, readicionar).
- Apagar remove o arquivo e as pastas de categoria que ficarem vazias (nunca a raiz `LIB_DIR`). Só aceita caminhos dentro de `LIB_DIR` ou `TEMP_DOCS_DIR`.

## Índice em memória (`LibraryIndex`)
- Guarda só **metadados** por id: meta, caminho, nome do arquivo, prévia (até 200 caracteres de texto puro) e uma chave de busca normalizada (título, nome do arquivo, tags e categorias). O corpo do texto **não** fica em memória.
- É reconstruído dos arquivos (entrada e biblioteca) ao iniciar a API e em `POST /library/reindex`. Cada operação (publicar, arquivar, descartar, criar artigo) atualiza o índice.
- Arquivo inválido (sem frontmatter, id diferente do nome etc.) é ignorado e listado em `errors` (nome do arquivo + motivo); não derruba o índice.
- Mesmo id em dois arquivos (ex.: falha no meio de uma movimentação): vale o de `updatedAt` mais recente e o outro vira erro.

## Busca e filtros (`LibrarySearch`)
- Por padrão lista só `published`. `status` aceita `published`, `archived` e `pending`.
- Filtros combináveis (todos precisam valer): `type`, `source`, `category` (caminho; casa o nível e tudo abaixo dele), `tag` (o documento precisa ter todas).
- Texto (`q`): divide em palavras; cada palavra deve aparecer nos metadados (título, nome do arquivo, tags, categorias) **ou** no conteúdo. Ignora maiúscula e acento.
- Primeiro filtra pelos metadados em memória; só então lê do disco (8 por vez) os arquivos que ainda não casaram por metadados. Cada resultado indica `matchedIn`: `metadata` ou `content`.
- Ordenação: `title` (padrão, alfanumérica natural pt-BR) ou `recent` (mais novos primeiro). Valor inválido em tipo, origem, status ou ordenação dá 400.
- Os resultados trazem metadados, nome do arquivo e prévia, nunca o corpo.
- **Conteúdo gerado (`has`):** lista com `infographic` e/ou `mind-map`; a página só entra se tiver **todos** os conteúdos pedidos guardados (`InfographicStore` e `MindMapStore`). Valor desconhecido ou que não seja lista é `BadRequest`. Sem os armazenamentos (testes, módulo mínimo) um pedido de conteúdo não devolve nada. Os resultados também trazem `hasInfographic` e `hasMindMap` (só quando existem), com a mesma regra do filtro.

## Operações (`LibraryService`)
- **Entrada:** documentos `pending` do mais recente ao mais antigo.
- **Adicionar (`publish`):** vale para pendente ou arquivado. Define título (opcional, mantém o atual), categoria (1 a 4 níveis, obrigatória) e tags (opcionais, mantém as atuais). Move o arquivo para a pasta da categoria, apaga o antigo só depois de gravar o novo e atualiza `updatedAt`. Documento já publicado dá 400.
- **Editar (`update`):** só de documento **publicado** (pendente/arquivado dá 400). Campos opcionais: `title`, `category` (1 a 4 níveis), `tags` e `content`; o que não vier mantém o valor atual. Conteúdo ou título em branco dá 400. Trocar título renomeia o arquivo e trocar categoria move para a nova pasta; o arquivo antigo (e pastas que ficarem vazias) só é apagado depois de gravar o novo, e categoria inválida não altera nada. Atualiza `updatedAt` e mantém `createdAt`, tipo, origem e `sourceUrl`.
- **Remover da biblioteca (`archive`):** só de publicado. Remoção lógica: `status: archived`, o arquivo continua em `lib/` e some da biblioteca, da árvore de categorias e das tags. Pode ser readicionado.
- **Excluir (`discard`, canal `library:documents:delete`):** apaga o arquivo de verdade, **em qualquer situação** (pendente, publicado ou arquivado), tira do índice e das categorias e tags, e **apaga também o mapa mental da página** (`data/mind-maps.json`), com as edições do usuário, **e o infográfico** (`data/infographics.json`). Não há como desfazer. Nos livros o capítulo passa a aparecer como "Página indisponível" (o id continua na estrutura do livro). A Classificação ("Descartar") usa o mesmo caminho.
- **Criar artigo:** título e conteúdo obrigatórios, categoria de 1 a 4 níveis. Nasce publicado, `type: article`, `source: manual`, id uuidv7.
- **Categorias:** árvore só dos publicados, com contagem por nível (inclui os níveis abaixo), em ordem natural. **Tags:** só dos publicados, com contagem, em ordem natural.
- Id inexistente dá 404. Categoria inválida não altera nada (o arquivo continua onde estava).

## Sugestão de classificação com IA (`LibraryClassifier`)
- `POST documents/:id/suggest` (`modelId?`) pede ao **Gemini** um título, uma categoria e tags para o documento (qualquer status). Não altera nada: o usuário revisa e só então publica.
- Modelo: o informado; sem `modelId`, o mais barato de `gemini.pricing.ts` (menor entrada + saída por milhão de tokens). O uso entra no `usage` como qualquer chat.
- O prompt leva o título, os primeiros 6000 caracteres do conteúdo, as categorias publicadas (caminhos `A > B`) e até 60 tags mais usadas, pedindo para **preferir** o que já existe.
- A resposta deve ser um JSON; cercas de código ao redor são toleradas. A categoria é limitada a 4 níveis, sanitizada e, em cada nível, reaproveita a grafia da pasta existente (ignorando acento e maiúscula). Tags: minúsculas, sem duplicadas, reaproveitam a grafia das existentes, no máximo 6. Título vazio mantém o atual.
- Falha da IA, resposta sem JSON, categoria ausente/vazia ou com nome inválido dão 502 com mensagem em português. Id inexistente dá 404 (sem chamar a IA).

## Mapa mental com IA (`MindMapService`)
- O mapa mental de **revisão** de um resumo é gerado pela IA (Gemini) com um **prompt próprio** (`ai/prompts/mind-map.prompt.ts`), diferente do prompt do resumo. Só para páginas do tipo **Resumo** (outro tipo → 400). Detalhes de uso e limites em `../../mapa-mental.md`.
- `get(id)` devolve o mapa guardado ou `null`; `stale` é `true` quando o texto da página mudou depois da geração (compara o hash SHA-256 do conteúdo). `generate(id, modelId?)` gera, guarda e devolve; gerar de novo **substitui** o mapa. Pedidos simultâneos para a mesma página compartilham uma única chamada à IA.
- **Formato:** `{ subtitle?, nodes: [{ label, note?, children }] }`. O `label` é o termo (a pista); a `note` é uma frase curta do resumo sobre ele (definição, função, regra); o `subtitle` diz do que o resumo trata. Mapas guardados antes da `note` e do `subtitle` continuam válidos (os campos são opcionais).
- Entrada da IA: título e o texto do resumo (cortado em 150 mil caracteres, raro). O consumo entra no registro de uso como qualquer chamada de IA.
- **A resposta é validada** (`parseMindMap`, `domain/mind-map.ts`) e cortada nos limites, não rejeitada: no máximo 8 ramos, 3 níveis, 50 nós, 50 caracteres por rótulo (o termo), 100 por frase curta (`note`) e 70 no subtítulo (corta numa palavra inteira, com "…"); tira markdown e pontuação final, descarta nó sem rótulo e `note` vazia ou igual ao rótulo. JSON em cercas de código ou com texto em volta é aceito. Sem nenhum nó utilizável → 502 "A IA não retornou um mapa mental válido. Tente novamente." e o mapa antigo, se houver, fica.
- Falha do provedor → 502 com a mensagem em português do provedor (ver `ai.md`); sem mensagem, "Não foi possível gerar o mapa mental com a IA. Tente novamente.".
- **Edição pelo usuário (`save`, canal `library:mind-map:save`):** guarda o mapa como o usuário o deixou (subtítulo, termos, frases, nós a mais ou a menos). Só para resumos (outro tipo → 400). O texto é validado por `parseEditedMindMap` com os **limites de edição** (`src/shared/mind-map-limits.ts`, os mesmos da tela): até 20 ramos, 4 níveis, 150 nós, 80 caracteres no termo, 220 na frase e 100 no subtítulo; o texto fica **como foi digitado** (só junta espaços e apara; markdown e pontuação são mantidos), nó sem termo some e frase vazia ou igual ao termo é descartada. Sem nenhum ramo com texto → 400 "O mapa precisa ter pelo menos um ramo com texto.". O mapa fica marcado `edited: true`, mantém o modelo e a data de criação do mapa da IA (sem mapa anterior, `model` é `manual`) e o hash do texto passa a ser o de agora, então `stale` volta a `false`. **Gerar de novo** substitui o mapa e tira a marca `edited` (a tela pergunta antes).
- Guardado em `data/mind-maps.json` (`MindMapStore`, JSON atômico com `.bak`, um mapa por id de página). Arquivo ilegível sem cópia boa → começa vazio; falha ao gravar → o mapa vale em memória e o usuário é avisado (`BackAlerts`). Não é apagado quando a página é descartada (sobra só um registro pequeno).

## API (antes `/api/v1/library`; hoje canais `library:*`)
- `GET documents` (`q`, `category` repetido por nível, `type`, `source`, `tag` repetido, `status`, `sort`), `GET documents/:id` (meta + conteúdo), `GET inbox`, `GET categories`, `GET tags`, `GET index` (total e erros), `POST reindex`.
- `POST documents/article` (`title`, `category[]`, `tags[]`, `content`), `POST documents/:id/publish` (`title?`, `category[]`, `tags[]?`), `PATCH documents/:id` (`title?`, `category[]?`, `tags[]?`, `content?`), `POST documents/:id/suggest` (`modelId?`), `POST documents/:id/archive`, `DELETE documents/:id` (204).
- Campos de lista (`category`, `tags`) que não sejam lista de textos dão 400.

## Livros (`BookService`, `BookStorage`)
- Um **livro** é só uma **lista ordenada de documentos que já existem**, agrupados em **módulos**; o texto continua nos documentos (nada é copiado). Campos: `id` (uuidv7), `title`, `kind` (`pos` Pós-graduação, `course` Curso, `study` Estudo — padrão —, `book` Livro), `description`, capa (`subtitle`; `coverColor`: uma das 15 cores do tema (`pink`, `rose`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue` padrão, `indigo`, `violet`) ou `slate`, que só continua válida para livros antigos e não é oferecida na tela; cor desconhecida dá 400; `coverImageUrl`: vazio ou URL http(s) válida, senão 400, e `""` remove a imagem), `createdAt`, `updatedAt`, `modules` (`id`, `title`, `documentIds` em ordem). Livro salvo antes da capa existir ganha os padrões ao ser lido (azul, sem imagem nem subtítulo). Módulo com título vazio = capítulos soltos, sem cabeçalho. O livro nasce com um módulo vazio.
- **Persistência:** os livros **não ficam só em memória**: cada um é gravado em disco em `LIB_DIR/_livros/<id>.json` a cada mudança e sobrevive a reiniciar a API ou o computador. Só se perde se a pasta `lib` for apagada. Ela fica **fora do git** (os repositórios são só `back` e `front`), então o backup é por conta do usuário (copiar a pasta `lib`, que guarda também os documentos).
- Armazenamento: um `.json` por livro em `LIB_DIR/_livros/<id>.json` (gravação atômica). Não há `.md` ali, então a biblioteca ignora a pasta; arquivo inválido é ignorado com aviso no log. O id do livro só aceita letras, números e hífen (impede sair da pasta).
- Um documento aparece **uma vez** por livro (duplicado dá 400). Só documentos **publicados** entram; ao salvar a estrutura, quem já estava no livro pode ficar mesmo se virou indisponível (para dar para removê-lo).
- Documento removido da biblioteca, arquivado ou apagado continua listado no livro como **indisponível** ("Página indisponível") e é **pulado na leitura**.
- Excluir o livro apaga só o arquivo JSON; os documentos ficam.
- **Leitura contínua** (`read`): módulos e capítulos na ordem, com o conteúdo de cada capítulo disponível.
- **Pesquisa no livro** (`search`): divide a consulta em palavras; uma **linha** do capítulo casa quando tem todas as palavras (sem diferenciar maiúscula e acento). Devolve capítulo, módulo, `line` (base 1) e um `snippet` de até ~160 caracteres ao redor (sem `#`, `*` etc., com `…` nos cortes). No máximo 3 trechos por capítulo e 50 no total. Consulta vazia devolve lista vazia.
- Rotas (`/api/v1/library/books`): `GET` (`documentId?` marca `containsDocument`), `POST` (`title`, `kind?`, `description?`), `GET :id`, `PATCH :id`, `DELETE :id` (204), `PUT :id/structure` (`modules[]`), `POST :id/chapters` (`documentId`, `moduleId?`; entra no fim do módulo, padrão o último), `GET :id/read`, `GET :id/search?q=`. Livro inexistente dá 404; título vazio, tipo inválido, documento fora da biblioteca, repetido ou módulo inexistente dão 400.
- **Progresso de leitura** (no próprio JSON do livro): `readDocumentIds` (capítulos marcados como lidos), `lastPosition` (`documentId` + `elementId` do último ponto lido, para "continuar de onde parou") e `completedAt`. O livro fica **concluído** (`completedAt` preenchido) quando todos os capítulos **disponíveis** foram lidos (há pelo menos um); a data da conclusão se mantém enquanto continuar completo. Desmarcar um capítulo, acrescentar um capítulo novo ou o livro ficar sem capítulos disponíveis desfaz a conclusão. Capítulos que saem do livro são descartados do progresso e da posição. Marcar leitura e guardar posição **não** mudam o `updatedAt` do livro. Livros antigos, sem esses campos, começam sem progresso.
- A lista traz por livro `availableCount`, `readCount`, `completedAt` e `lastPosition` (base da barra de progresso e do "Continuar").
- Rotas do progresso: `PUT :id/chapters/:documentId/read` (`{ read: boolean }`; capítulo fora do livro ou `read` não booleano dão 400) e `PUT :id/position` (`documentId`, `elementId` de até 200 caracteres; capítulo fora do livro ou posição inválida dão 400). `DELETE :id/progress` **zera o progresso de uma vez** (capítulos lidos, posição e conclusão); a estrutura e os dados do livro, inclusive o `updatedAt`, não mudam; vale também para livro sem progresso.

## Pipelines de vídeo
- Resumo e transcrição gravam, em `TEMP_DOCS_DIR`, `<slug>_<jobId>.md` com frontmatter `status: pending`, `source: video`, `sourceUrl` com a URL do vídeo e o texto como corpo.
- Título padrão: o rótulo do job ("Resumo de vídeo" / "Transcrição de vídeo"), a menos que o job tenha recebido título; categoria e tags informadas na criação do job (ver `doc/jobs.md`) também vão no frontmatter pendente. O usuário ajusta tudo ao adicionar à biblioteca.

## Infográfico (`InfographicService`, `InfographicStore`)
- O infográfico de um resumo é gerado pela IA (Gemini) com um **prompt próprio** (`ai/prompts/infographic.prompt.ts`) em que ela faz o papel de orquestradora: planeja a história (capa, de 2 a 6 seções cada uma no seu modelo, e fechamento), ou faz uma seção só se o usuário escolheu um modelo, escreve os textos só com o que o resumo diz e escolhe as peças do banco (catálogo em `shared/infographic-pieces.ts`). Só para páginas do tipo **Resumo** (outro tipo → 400) e **só quando o usuário pede** (não roda ao abrir a aba). Detalhes, modelos, limites e persistência em `../../infografico.md`.
- A resposta é validada por `parseInfographic` (limites de texto, itens por modelo, peças desconhecidas viram vazias, comparativo exige dois lados); seção que não se sustenta é descartada e menos de 2 seções (1 com modelo escolhido) conta como falha (`BadGatewayException`, "A IA não retornou um infográfico válido. Tente novamente.").
- Guardado em `data/infographics.json` (`InfographicStore`, JSON atômico com `.bak`, um por id de página). Arquivo ilegível sem cópia boa → começa vazio; falha ao gravar → vale em memória e o usuário é avisado (`BackAlerts`). **É apagado quando a página é excluída** (`LibraryService.discard`). Gerações simultâneas da mesma página compartilham a mesma resposta.
