# Criar página a partir de um PDF

Status: **as quatro fases estão implementadas** (leitura, limpeza, divisão, avisos, job com IA, progresso em disco, retomada com outro modelo, limpeza de arquivos de processos não terminados, a tela e a passada final que preenche título, categoria e tags) e a **leitura de páginas escaneadas** (reconhecimento de texto em imagens, seção "Páginas escaneadas" abaixo).

## Objetivo
Em **Criar página** o usuário escolhe um arquivo `.pdf`. O app lê **só o texto**, divide em partes, a IA resume cada parte e uma passada final preenche os dados da nova página (título, categoria, resumo). O trabalho é um **job** (aparece em Jobs, com progresso, cancelar e tentar de novo) e **grava o progresso em disco**: se o computador desligar no meio, dá para continuar de onde parou, e o app avisa que o job foi interrompido.

## Decisões
- **Biblioteca + IA, não só biblioteca.** PDF não tem estrutura (título, seção, lista), só texto com posição. A biblioteca extrai o texto; a IA entende e resume. A extração usa o `pdfjs-dist` (Mozilla, mantido, roda no Node).
- **Resumo do conteúdo**, não o texto completo em Markdown (decisão do usuário).
- **Texto digital primeiro, imagem só onde precisa.** A leitura é **híbrida por página**: a página com texto digital é lida pelo texto (grátis e exato); só a página **sem texto e com imagem** é lida por reconhecimento de texto na imagem. Fotos, gráficos e tabelas desenhadas como imagem continuam fora (a tela avisa).
- **Funciona com Gemini e Ollama.** Como a leitura é local e a IA recebe texto, o mesmo fluxo serve aos dois provedores (o PDF nunca vai inteiro para a IA).
- **O renderer nunca manda caminho nem bytes.** O diálogo de arquivo abre no main e o PDF lido é identificado por um **token** (mesmo padrão do backup). O texto fica na memória do main (no máximo 3 PDFs).

## Limites
| Limite | Valor | Onde |
|---|---|---|
| Tamanho do arquivo | 50 MB | `PdfLimits.MAX_BYTES` (`shared/contracts/pdf.ts`) |
| Páginas | 1500 | `PdfLimits.MAX_PAGES` |
| Páginas com reconhecimento de imagem | 500 (só conta as que precisam) | `PdfLimits.MAX_OCR_PAGES` |
| Texto mínimo (documento) | 200 caracteres no documento todo, depois do reconhecimento; abaixo disso, `NO_TEXT` | `MIN_DOCUMENT_CHARS` |
| Texto mínimo (página) | menos de 20 caracteres digitais + imagem = página lida por imagem | `MIN_PAGE_TEXT_CHARS` |
| Parte enviada à IA | ~32 mil caracteres (~8 mil tokens) | `PDF_CHUNK_CHARS` |

## Fase 1: leitura do arquivo (implementada)
Fluxo de `pdf:inspect` (`src/pdf/pdf-inspector.ts`):
1. Diálogo nativo, só `.pdf`. Cancelar devolve `null`.
2. `PdfExtractor` confere o arquivo (existe, até 50 MB, começa com `%PDF-`), abre e lê **uma página por vez**, devolvendo o controle ao app entre as páginas (livro grande não trava o app). Progresso em `pdf:progress`; `pdf:cancel` interrompe entre duas páginas.
3. `cleanPages` limpa o texto: tira número de página (`12`, `Página 12`, `- 12 -`, `12/300`), cabeçalho e rodapé que se repetem (nas 2 primeiras e 2 últimas linhas, se aparecem em ao menos 40% das páginas e o documento tem 4 páginas ou mais), refaz palavras quebradas com hífen no fim da linha e junta as linhas em parágrafos (linha curta que termina a frase, ou item de lista, abre parágrafo novo).
4. `chunkPages` divide em partes de até 32 mil caracteres, **sem cortar parágrafo** (parágrafo maior que o limite é cortado por frases) e guardando as páginas de cada parte.
5. O resultado fica na `PdfSessionStore` e a tela recebe o resumo: páginas, páginas sem texto, caracteres, tokens (**estimativa**, caracteres ÷ 4), partes, chamadas previstas (partes + 1) e os avisos.

### Mensagens ao usuário
Erros (chegam como `VALIDATION`, em português e sem citar ferramentas internas; textos em `pdf-read.error.ts`):
| Situação | Mensagem (resumo) |
|---|---|
| Arquivo movido ou apagado | "Não foi possível abrir o arquivo. Ele foi movido ou apagado?" |
| Não é PDF | "Este arquivo não é um PDF válido." |
| Mais de 50 MB | informa o tamanho e o limite e sugere dividir o documento |
| Mais de 1500 páginas | informa o número e o limite |
| Protegido por senha | "Este PDF é protegido por senha. Remova a proteção e tente de novo." |
| Corrompido | "O arquivo está corrompido ou incompleto e não pôde ser lido." |
| Sem texto (nem por imagem) | "as páginas são imagens ou fotos sem texto legível"; sugere um arquivo mais nítido |
| Mais de 500 páginas para ler por imagem | informa o número e o limite e sugere dividir o documento |
| Escaneado e o idioma não pôde ser baixado | pede para conferir a internet e tentar de novo (os dados de idioma são baixados na primeira vez) |
| Já lendo outro | "Já existe um PDF sendo lido. Aguarde terminar." |

Avisos antes de seguir (`PdfWarning`, com `level` `info` ou `warning`):
| Código | Quando | Nível |
|---|---|---|
| `IMAGES_IGNORED` | sempre: só o texto é lido (inclusive o de páginas escaneadas); fotos e gráficos não | info |
| `OCR_USED` | houve páginas lidas por imagem: quantas, o idioma e que pode haver erros | info |
| `OCR_DISCARDED` | páginas lidas por imagem sem texto legível (capa com foto, arte) ficaram de fora | warning |
| `OCR_SLOW` | 100 páginas ou mais lidas por imagem: demorado, mas o resultado fica salvo | warning |
| `LAYOUT_MAY_SCRAMBLE` | sempre: colunas, tabelas, legendas e notas de rodapé podem sair fora de ordem | info |
| `PAGES_WITHOUT_TEXT` | há páginas sem texto (as descartadas pela leitura de imagem têm o próprio aviso); passa a `warning` com 20% ou mais das páginas | info/warning |
| `LARGE_DOCUMENT` | a partir de ~60 mil tokens: informa tokens, número de partes, demora e consumo da IA | warning |

### Como o código se divide
- `src/back/modules/pdf/` (reaproveitado pelo job nas próximas fases): `pdf-read.error.ts` (problemas e mensagens), `pdf-opener.port.ts` (porta), `pdfjs-opener.ts` (adaptador do `pdfjs-dist`), `pdf-extractor.ts`, `pdf-clean.ts`, `pdf-chunker.ts`, `pdf-warnings.ts`.
- `src/pdf/`: `pdf-inspector.ts` (`pdf:inspect` e `pdf:cancel`) e `pdf-session.store.ts` (tokens).
- `src/ipc/handlers/pdf.handler.ts`.
- O `pdfjs-dist` é só ESM e o main compila em CJS: o adaptador o carrega por `import()` dinâmico com caminho absoluto (o `tsc` trocaria um `import()` comum por `require`). Roda com `isEvalSupported: false`.

## Páginas escaneadas: reconhecimento de texto em imagens (implementado)
Para PDFs escaneados ou feitos de imagens. Tudo **local** (nenhuma imagem sai do computador) e atrás da porta `OcrEngine`, então outro motor entra sem mexer no resto.

**Fluxo** (`PdfExtractor` → `OcrPageReader`, em `src/back/modules/pdf/ocr/`):
1. Lê o texto digital de todas as páginas. As páginas com menos de 20 caracteres **e com imagem** (`hasImages`; página em branco não conta) são as candidatas. Nenhuma candidata: o reconhecimento nem começa.
2. **Descobre o idioma.** Lê uma amostra de ~4 páginas espalhadas pelo documento (com o idioma inglês, que só serve para isso) e junta ao texto digital já lido. `detectLanguages` classifica cada trecho pelas palavras comuns de cada idioma (sem acento, porque o motor pode errar acentos; palavras que existem em vários idiomas valem menos). **Documento misto** (aula de francês explicada em português) devolve os dois: um idioma só entra com ao menos 15% das palavras e 2 trechos, no máximo 3 idiomas. Sem sinal, usa português + inglês.
3. **Garante os idiomas** (`ComponentOcrPacks`): o que falta é baixado sozinho, na versão **rápida** (1 a 4 MB, checksum conferido). Se a versão de **alta qualidade** estiver instalada, ela vale mais. A tela mostra "Baixando os dados do idioma (só na primeira vez)".
4. **Lê cada página** com os idiomas definitivos: a página vira imagem (`renderPage`, lado maior de 2000 px), o motor lê, e o resultado vai para o disco **página a página**.
5. **Filtra o lixo.** `buildPageText` mantém só as **palavras** com confiança de 70% ou mais (em foto ou arte o motor "lê" lixo) e descarta a página inteira se sobrarem menos de 4 palavras com sentido. Página mista (texto ao lado de uma foto) fica só com o texto.

**Idiomas** (`ocr-languages.ts`, o registro único): português, inglês, espanhol, francês, alemão e italiano. Cada um aparece em Configurações > Componentes, grupo "Leitura de PDF escaneado", nas duas qualidades (rápido e alta qualidade, como os modelos de transcrição). **Idioma novo** = o id em `OCR_LANGUAGE_IDS`, a entrada em `OCR_LANGUAGES` (tamanho e SHA-256 dos dois modelos) e as palavras em `language-profiles.ts`; o catálogo, o detector e o motor o pegam sozinhos. Os dados vêm de um commit fixo dos repositórios `tessdata_fast` e `tessdata_best` (o checksum nunca muda).

**Cache em disco** (`OcrPageCache`): `temp/pdf/<hash do arquivo>/page-0007.json` (texto, confiança e a **assinatura** do motor: idiomas e qualidade) e `sample-NNNN.json` (a amostra de idioma). A chave é o hash do **conteúdo** do PDF: escolher o mesmo arquivo de novo (de qualquer pasta), ou continuar depois de uma queda, **não refaz** as páginas já lidas (de ~33 s para ~2 s num escaneado de 25 páginas). Mudou o idioma ou a qualidade instalada, a assinatura muda e a página é lida de novo. Só o texto pronto fica na memória; imagens e o motor são soltos a cada página. A pasta é a mesma do progresso dos resumos, então a limpeza de 30 dias e o botão "Limpar arquivos temporários" cobrem o cache também.

**Motor** (`TesseractOcrEngine`): Tesseract em WASM, num worker próprio (o app não trava), só o modo LSTM. Cada sessão monta uma pasta temporária com os dados dos idiomas pedidos (na qualidade instalada de cada um) e o motor **nunca baixa nada sozinho**. Empacotado, o worker e as bibliotecas dele ficam fora do `app.asar` (`asarUnpack` em `electron-builder.yml`; o código troca `app.asar` por `app.asar.unpacked`).

**Tempo medido** (CPU, modelo rápido, 2000 px): de 1 a 3 s por página; 500 páginas levam de 10 a 25 min. O progresso mostra "Reconhecendo o texto da página N de M" e **Cancelar leitura** vale entre páginas (o que ficou pronto continua salvo).

**Idioma do resumo.** A regra fixa do prompt de resumo manda escrever **no idioma da fonte, sem traduzir**; fonte mista (aula de francês em português) mantém a mistura: a explicação no idioma em que foi dada e termos, frases e exemplos no idioma original. Vale para vídeo e PDF. Em **aula de idiomas** as equivalências ensinadas não são traduzidas ("vida = life" fica "vida = life", nunca "vida = vida", em qualquer idioma, inclusive japonês), e uma aula inteira em inglês que ensina francês gera resumo em inglês, com os exemplos em francês.

**Limites conhecidos:** texto branco sobre foto ou arte não é lido (o filtro descarta a página e avisa); manuscritos, letras muito pequenas e tabelas desenhadas saem com erros. Ler essas páginas com uma IA de visão ficou para outra entrega.

## Fase 2: job com IA e progresso em disco (implementada)
Tipo de job `pdf-to-summary` ("Resumo de PDF"), criado por `jobs:create-pdf-to-summary` com o token do `pdf:inspect`.

**Criação (`PdfJobPreparer`, `JobLauncher.startPdfToSummary`)**
1. Valida título, categoria e tags **antes** de gravar qualquer coisa.
2. Pega o texto lido pelo token (token desconhecido: "A leitura deste PDF não está mais disponível... Escolha o arquivo de novo."), divide em partes e **grava tudo em disco** em `temp/pdf/<chave>/`.
3. Só então cria o job, que guarda no histórico (`jobs.json`) a **chave** e os ajustes, nunca o token nem o caminho do arquivo. Por isso o job se retoma depois de fechar e abrir o app.
4. A leitura em memória é descartada (o texto já está em disco).

**Etapas** (`processors/pdf-to-summary`): `read-pdf` (confere a pasta de progresso), `summarize-parts` (uma chamada de IA por parte), `fill-page` (fase 4), `save-file` (grava o documento pendente na inbox, origem "PDF") e `clean-up` (apaga a pasta de progresso). Na etapa `summarize-parts` o pipeline mostra "parte 3 de 12" e uma barra com a porcentagem (`progress: { done, total }` do job, só em memória; some ao trocar de etapa). A nota do job fica reservada à tentativa automática da IA ("Tentando de novo (tentativa 2 de 3): ...").

**Progresso em disco** (`PdfCheckpointStore`)
- `manifest.json` (arquivo, páginas, ajustes e partes), `part-0000.txt` (texto de cada parte) e `summary-0000.md` (resumo de cada parte **pronta**), cada um gravado de forma atômica (arquivo temporário + renomear): uma queda de energia nunca deixa arquivo pela metade. O manifesto é gravado por último.
- **Chave** = hash do **texto** lido + nível de detalhe (24 caracteres hexadecimais). **O modelo não entra**: trocar de modelo (por exemplo, porque o limite de uso do primeiro acabou) **continua** o trabalho de onde parou, e o resumo final junta partes feitas por modelos diferentes. O nível de detalhe entra porque misturar níveis deixaria o texto desigual; mudá-lo começa um trabalho novo.
- Cada resumo é gravado assim que a parte termina. Ao rodar de novo, as partes com resumo pronto são lidas do disco e **a IA não é chamada de novo** para elas.
- A pasta `temp/pdf` nunca entra no backup. Chaves fora do formato são recusadas antes de tocar o disco.

**Quando algo para no meio**
- **Falha de uma parte** (limite de uso, serviço ocupado): as partes prontas ficam salvas e o job falha com "Falha ao resumir a parte N de M. <motivo> X de M partes já estão salvas: use \"Tentar de novo\" para continuar de onde parou."
- **Cancelar** vale entre as partes: o que ficou pronto continua salvo.
- **App fechado, queda de energia ou travamento**: ao abrir, o job aparece como falho ("Interrompido ao fechar o app.") e o aviso de abertura acrescenta que o resumo de PDF guardou o que já estava pronto e que "Tentar de novo" continua de onde parou (conta os jobs com progresso ainda em disco).
- **Percebido na lista de tarefas:** o job falho de PDF leva `resume: { done, total }` (lido do disco a cada consulta), para a tela mostrar "N de M partes prontas".
- **Tentar de novo** (`jobs:retry`) retoma o **mesmo job** (mesma chave de progresso). Dá para **trocar o modelo** na retomada (`providerId`, `modelId`, `thinking` no pedido): só as partes que faltam usam o modelo novo. Escolher o mesmo PDF de novo em Nova tarefa, com outro modelo, também continua o mesmo trabalho (mesma chave). Se a pasta de progresso foi apagada, recusa com "O texto deste PDF não está mais guardado no app... Escolha o arquivo de novo".
- Falha ao **salvar o documento** (disco cheio): o progresso fica, e tentar de novo salva sem chamar a IA.

**Limpeza**
- A pasta some ao concluir o job. As de jobs abandonados são apagadas na abertura do app quando estão sem uso há mais de 30 dias. Excluir o job do histórico **não** apaga a pasta.
- **Botão "Limpar arquivos temporários"** (Acompanhar): não precisa esperar os 30 dias. `jobs:leftovers` mede e `jobs:clean-leftovers` apaga o progresso de resumos de PDF que não terminaram e os vídeos e áudios temporários que processos que falharam deixaram. **Nunca apaga o que um job na fila ou rodando usa** (pela chave do progresso e pelo id do job no nome do arquivo) nem os documentos gerados (inbox e biblioteca). Depois de limpar, os resumos de PDF parados não podem mais ser retomados (aviso na confirmação).

## Fase 3: tela (implementada)
- **Nova tarefa** ganha o tipo "Resumo de PDF" (vem de `jobs:types`). O formulário (`PdfToSummaryForm`): **Escolher PDF** (só `.pdf`) → leitura com barra de páginas e **Cancelar leitura** → nome, tamanho, páginas, estimativa de tokens, partes, chamadas à IA e **todos os avisos** (atenção em amarelo, informação em azul) → IA, nível de detalhe e dados opcionais da página (título padrão: nome do arquivo) → aviso de **para onde o texto vai** (Gemini é serviço externo; Ollama roda no computador) e de que o progresso fica salvo e pode ser retomado → **Criar resumo do PDF**.
- **Acompanhar:** resumo de PDF parado mostra "N de M partes já estão salvas em disco" com barra, **Tentar de novo** e **Trocar modelo** (janela para escolher outra IA e continuar). O botão **Limpar arquivos temporários** fica no cabeçalho.
- Componentes reaproveitados: `Callout`, `ProgressBar`, `ConfirmDialog`, `ChatSettings`, `OptionSelect`, `JobDocumentFields`, `VideoJobFooter` (ganhou `submitLabel` e `errorMessage`), `HexFrame`. Erros viram o alerta do rodapé.

## Fase 4: preenchimento da página (implementada)
Depois de resumir todas as partes, a etapa `fill-page` ("Preencher dados da página") pede à IA **título, categoria e tags** da página.
- **Amostra, não o livro inteiro.** A IA recebe até ~12 mil caracteres dos resumos: cabendo, tudo; senão, **uma fatia igual do começo de cada parte** (`buildPageDigest`), para o documento inteiro estar representado e não só o início.
- **Reaproveita o classificador da biblioteca** (`LibraryClassifier.classify`): o mesmo prompt das sugestões de página, que **prefere as categorias e tags que a biblioteca já tem** (reaproveita a grafia de pastas existentes, sem acento ou maiúscula duplicando). Usa o **mesmo provedor e modelo** do resumo (Gemini ou Ollama).
- **O que o usuário preencheu vale mais**: título, categoria e tags informados em Nova tarefa nunca são trocados; a IA só preenche o que faltou. Se o usuário preencheu os três, **a IA nem é chamada**. Título vazio na resposta: vale o nome do arquivo.
- **Guardado em disco** (`page.json` na pasta de progresso): se salvar o documento falhar depois, a nova tentativa não gasta a chamada de novo.
- **Se a IA falhar** (limite de uso, resposta inválida): o job falha com "Todas as partes foram resumidas, mas não foi possível preencher título, categoria e tags da página. ... Os resumos estão salvos: use Tentar de novo para repetir só esta etapa (dá para trocar o modelo)." Os resumos das partes não são refeitos.
- O documento sai na inbox como página pendente, já com título, categoria e tags; ao adicionar à biblioteca, o diálogo abre preenchido.

## O que testar (fases 1 a 4)
1. **Nova tarefa → Resumo de PDF → Criar.** Clique em **Escolher PDF**: o seletor só mostra PDFs. Escolha um com texto (de preferência com mais de 100 páginas) e veja a barra de páginas; o resultado mostra páginas, tamanho, tokens, partes e os avisos. Cancelar o seletor não muda nada; **Cancelar leitura** no meio volta ao estado inicial.
2. **Erros:** tente um PDF escaneado (só imagens), um protegido por senha e um com mais de 50 MB: cada um mostra a mensagem em português no alerta do rodapé e o formulário continua usável.
3. Escolha a IA e o detalhe, confira o aviso de para onde o texto vai (troque Gemini por Ollama e veja a mensagem mudar) e clique em **Criar resumo do PDF**. A janela fecha e a tarefa aparece em Acompanhar; ao expandir, a etapa de resumo mostra "parte N de M" com barra.
4. **Retomada após fechar:** com um PDF de várias partes, feche o app pelo gerenciador de tarefas no meio. Ao abrir: aviso de processo interrompido dizendo que o resumo de PDF guardou o que já estava pronto; em Acompanhar o job falho mostra "N de M partes já estão salvas em disco". **Tentar de novo** continua da parte seguinte ("retomado: N já estavam prontas") e só as partes que faltam aparecem em Uso de IA.
5. **Trocar modelo:** em um job falho (por exemplo, com o Ollama desligado no meio), clique em **Trocar modelo**, escolha outra IA e **Continuar**: o novo job aproveita as partes prontas e usa o modelo novo nas que faltam.
6. Ao concluir, o documento "PDF" aparece na inbox com os resumos em ordem e a pasta `temp/pdf/<chave>` some. Com a etapa nova "Preencher dados da página" completa, ele já vem com **título, categoria e tags** (reaproveitando pastas e tags que a biblioteca já tem); ao adicionar à biblioteca, o diálogo abre preenchido. Se você preencheu título, categoria e tags em Nova tarefa, eles prevalecem; se preencheu só alguns, a IA completa o resto.
6b. **Falha na passada final:** com o modelo indisponível só nesse momento (ex.: desligue o Ollama quando o job chegar em "Preencher dados da página"), o job falha dizendo que os resumos estão salvos; **Tentar de novo** (pode trocar o modelo) repete só essa etapa, sem refazer as partes.
7. **Limpar arquivos temporários** (Acompanhar): com um job de PDF falho e, se quiser, sobras de vídeo, o botão mostra quantos arquivos e quanto espaço serão apagados; **Cancelar** não apaga nada; **Apagar** limpa, mostra o que foi liberado, e o job de PDF falho perde o "N de M partes". Com um job rodando, os arquivos dele continuam. Sem sobras, o botão avisa que não há o que limpar.
8. Testes automáticos: `npm test`, `npm run test:renderer`, `npm run lint` e `npm run typecheck:renderer` passam.

9. **PDF escaneado:** escolha um PDF feito só de imagens (ex.: slides digitalizados). A barra passa por "Identificando o idioma…" e "Reconhecendo o texto da página N de M"; na primeira vez, "Baixando os dados do idioma". O resultado mostra "Lidas por imagem" e o idioma, e os avisos dizem quantas páginas foram lidas por imagem e quais ficaram de fora (fotos). Escolha o **mesmo PDF de novo**: a leitura leva poucos segundos.
10. **Documento misto:** um PDF escaneado de aula de francês explicada em português deve mostrar "Português, Francês" e o resumo manter a explicação em português e os exemplos em francês.
11. **PDF digital:** um PDF de texto continua lendo em poucos segundos, sem baixar nada.

### Leitura real
O adaptador foi verificado contra um PDF de 6 páginas gerado à mão (o `pdfjs-dist` abre, lê as páginas e libera o documento). O empacotado (`npm run dist:dir`) ainda precisa ser conferido por quem for validar: o `pdfjs-dist` é carregado de dentro do `app.asar`.

### Dependência
`pdfjs-dist` (versão 6.x, exige Node 22.13+ ou 24; o projeto usa o 24). Ele traz como dependência opcional o `@napi-rs/canvas` (binário pronto por sistema, sem compilar), que o `pdfjs-dist` usa no Node para o que o navegador já tem (`DOMMatrix` e similares). **Não excluir do empacotamento**: sem ele a leitura pode falhar no Electron.
