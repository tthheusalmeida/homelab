# Chat com as páginas da biblioteca (RAG)

Status: **implementado** (busca por palavras, referências na conversa e Ollama como componente instalável, ver `componentes.md`). Fica para depois: busca por sentido (embeddings).

## O que o usuário vê (resumo)
- **Marcas `[1]`, `[2]` no texto, referências no fim:** o texto da resposta mantém as marcas como o modelo as escreveu, e abaixo dela fica a faixa de referências: um filete, a palavra "referências" e, **alinhados à direita**, um ícone de página por fonte, **com o número da marca no ícone** (1, 2, 3, 4…, na ordem da lista). O `[n]` do texto é exatamente o número do ícone. Ao passar o mouse (ou focar), o nome `Página › Seção` **abre para a esquerda** e fecha ao sair; clicar abre a página na seção (`ChatReferences`).
- **Mais de uma referência:** a faixa lista **todas** as páginas que acompanharam a pergunta (uma por seção), não só as que o modelo citou; as não citadas também aparecem, com o número que o modelo viu.
- **"Não achei isso nas suas páginas":** linha discreta, **do app e não do modelo** (modelos pequenos variam a frase, copiam instruções e às vezes dizem "não encontrei" sobre o que está nas páginas). Aparece quando a mensagem parece uma pergunta (4 palavras ou mais) e nenhuma página virou referência (`ChatMessage.notInPages`); "oi, tudo bem?" não dispara.
- **Mais espaço vertical:** o cabeçalho da Conversa não tem a frase de descrição e traz os seletores de IA na linha do título; o campo de mensagem e a lista são mais compactos.

No chat da área de IA, toda pergunta passa antes pelas **páginas publicadas da biblioteca**. Se há trechos que têm a ver, o modelo responde com base neles e a resposta traz, abaixo, a lista de **referências**: cada uma é um link que abre a página **na seção** usada (`/library/<id>#<âncora>`). Se nada tem a ver (ex.: "oi, tudo bem?"), o chat responde como sempre e não mostra referências. Não há tela de busca à parte.

## Como funciona (da pergunta à referência)
1. **Escolher o contexto** (`rag/application/rag-context.service.ts`). Busca os melhores trechos e fica só com os que **merecem** ir ao modelo: contêm pelo menos metade das palavras úteis da pergunta (`MIN_COVERAGE`) e pontuam pelo menos 35% do melhor (`MIN_RELATIVE_SCORE`). **Quantos entram depende da janela de contexto do modelo** (`shared/rag-budget.ts`, `contextBudget`): janela curta (menos de 16 mil tokens) recebe até 3 trechos / 3.000 caracteres, média 5 / 6.000, longa (65 mil ou mais) 8 / 12.000; janela desconhecida usa a média. A tela manda a janela do modelo escolhido em `contextLimit` (`chat:send`).
   **Pergunta de acompanhamento** (`rag/domain/follow-up.ts`): só é buscada junto com a anterior se for curta (menos de 3 palavras úteis) **e** apontar para o que já foi dito ("e a segunda?", "e isso?", "dê um exemplo", "fale mais"). Pergunta curta com assunto próprio ("E sobre DevOps?") é buscada sozinha, e avisar que o assunto mudou ("vamos falar só sobre X", "mudando de assunto") sempre corta a ligação.
2. **Montar o que vai ao modelo** (`chat/chat-context.ts`, `withContext`). Os trechos da **mesma seção são juntos** (`groupBySection`) e as seções entram numeradas (`[1] Página › Seção`, `[2]`, `[3]`… sem buracos) à frente da pergunta, com a instrução de responder com base neles, citar `[n]` e dizer com clareza quando eles não bastam. O que fica **gravado** no chat é a pergunta como o usuário escreveu, sem os trechos. O histórico reenviado ao modelo leva as respostas antigas **sem as marcas `[n]`** (`withoutCitations`): elas só valem para os trechos daquela vez e, reenviadas, se confundem com a numeração dos trechos novos.
3. **Montar as referências** (`referencesFor`). Uma referência por seção, **na mesma ordem e com a mesma numeração** que o modelo recebeu (`ChatReference.number` = o `[n]` do texto = o número no ícone), então o texto e a lista nunca desencontram. **A lista é montada pelo app, não pelo modelo**: o link nunca é inventado. Só há lista quando a resposta se apoia nas páginas: o modelo citou ao menos uma seção (citação dentro de frase que nega as páginas não conta) ou a primeira seção casa com pelo menos 75% das palavras da pergunta (`STRONG_COVERAGE`). **Referência errada pesa mais que referência faltando**: resposta que abre dizendo que não achou (`saysNotFound`), ou que só cita para dizer que o trecho não serve, fica sem lista e o app mostra "Não achei isso nas suas páginas".
4. **Gravar.** A mensagem do assistente guarda `references` (contrato `ChatReference` em `shared/contracts/chat.ts`); sem páginas relevantes, o campo nem existe. Backup e restauração levam as referências junto.
5. **Falha da busca não derruba o chat**: se a busca der erro, a pergunta segue sem contexto.

O chat só conhece a porta `ChatContextSource` (`CHAT_CONTEXT`); quem a implementa é o `RagContextService`, ligado no `ChatModule`. Sem a porta (testes), o chat é o de sempre.

## Como a busca funciona (`rag/`)
1. **Cortar em trechos** (`domain/chunker.ts`): um trecho por seção (`#`, `##`...); seção grande é dividida por parágrafo (até 1.600 caracteres, sem partir bloco de código); seção sem texto não gera trecho. Cada trecho guarda o caminho de títulos, a **âncora** e a linha.
2. **Entender o texto** (`domain/text-analysis.ts`): minúsculas e sem acento; tira palavras vazias ("o", "de", "que", "diz"); reduz ao radical ("maneiras" e "maneira" viram o mesmo termo). Vale igual para as páginas e para a pergunta.
3. **Índice de palavras** (`domain/bm25-index.ts`, BM25): termo raro vale mais, trecho longo vale menos, e isso é medido **só no corpo**; título da página e cabeçalhos entram como **bônus somado** (para um trecho curto que só repete o título não ganhar de quem explica). Palavras da pergunta coladas e na mesma ordem ("primeira maneira") ganham mais.
4. **Corrigir digitação** (`domain/query-builder.ts`): palavra que **não existe** nas páginas é trocada pelas parecidas que existem (letras trocadas, a mais ou a menos, ou começo de palavra), com peso menor. Palavra de até 3 letras não é "corrigida".
5. **Manter em dia** (`application/rag-search.service.ts`): o índice vive **em memória** e é montado das próprias páginas (a fonte da verdade). Antes de buscar, confere data e tamanho dos arquivos (no máximo a cada 1,5 s) e refaz só o que mudou, sumiu ou apareceu. Editar uma página, no app ou fora dele, nunca deixa a busca velha.
6. **Só páginas publicadas** entram. Rascunhos da caixa de entrada, removidas, livros (`_livros/*.json`) e transcrições da caixa de entrada ficam de fora.

Medido nos `docs/` do projeto: 39 arquivos → 448 trechos em 73 ms; cada busca leva de 0,1 a 5 ms.

## Aviso de conversa grande
O aviso antes do envio (80% da janela do modelo) soma ao histórico o que os trechos das páginas podem acrescentar (`contextOverheadTokens`: a instrução fixa mais o máximo de caracteres do orçamento da janela). O `num_ctx` pedido ao Ollama já contava os trechos, porque eles entram na mensagem antes do cálculo.

## Âncoras (o link cai na seção)
A regra que transforma um título em âncora (`## Fluxo de Trabalho` → `fluxo-de-trabalho`; repetido vira `-2`) é **uma só**, em `shared/markdown-headings.ts`, usada pelo indexador e pelo visualizador (`renderer/src/lib/markdown.ts` a reexporta). A página rola até a seção do endereço com `useScrollToHash` (`DocumentPage`).

## Por que não há índice em disco
A montagem leva milissegundos; guardar o índice só traria o risco de ficar velho. Em disco só irão dados **caros de refazer** (os embeddings, na próxima etapa), em `data/rag/`, fora do backup.

## Medir a acurácia
Montar 20 a 30 perguntas reais, cada uma com a página que deveria ser referenciada, e contar quantas vezes ela está nas referências. Acima de ~90% a busca por sentido é luxo; perto de 70%, vale fazê-la.

## Limites conhecidos
- Não entende **sinônimos** ("salvar no disco" ≠ "persistência"): é o que a busca por sentido resolve.
- O radical é por regras simples, sem dicionário; pode juntar palavras diferentes (a busca tolera, pois pergunta e páginas passam pelo mesmo caminho).
- Pergunta de acompanhamento só olha a pergunta anterior, não a conversa toda, e a regra de "apontar para o que já foi dito" é uma lista de palavras (pronomes, ordinais, "continue"), não entendimento da frase.
- O histórico ainda é reenviado **inteiro** a cada mensagem (sem corte nem resumo); só o aviso de conversa grande protege. Resumir ou cortar o começo da conversa muda o que o modelo "lembra" e fica para uma decisão à parte.
- O orçamento de trechos segue a janela do modelo, não o tamanho dele: um modelo pequeno com janela longa recebe muitos trechos e pode se perder.
- **A busca por palavras não sabe dizer "isso não está nas páginas".** Palavras genéricas casam por acaso e a correção de digitação pode ligar palavras diferentes ("capital" a "capitul"). Medido nos `docs/` do projeto, perguntas fora do assunto ainda recebem trechos como contexto; quem evita a referência errada é o modelo, que não cita o que não usou. Com modelo muito pequeno que ignora as instruções, a resposta pode vir sem referências. A busca por sentido melhora isso.
- Saudações ("oi", "tudo bem", "obrigado") são palavras vazias: não disparam busca.

## Pendente
- Busca por sentido (embeddings) e busca híbrida, se a medição mostrar que faz falta.
- Recuo de conversa longa (resumo ou corte do histórico antigo): hoje só o aviso de conversa grande e o histórico sem as perguntas respondidas com "não encontrei".
