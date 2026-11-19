# Transcrição com tempo

Transcrições novas guardam o instante em que cada trecho foi falado, e a tela usa isso para acompanhar a leitura e abrir o vídeo no momento certo. O vídeo **não é guardado**: ele continua sendo apagado depois de virar áudio, e o tempo serve para abrir o link original.

## Formato do documento
- Um bloco por trecho, separados por linha em branco, cada um começando com `[HH:MM:SS]`: `[00:02:07] Texto do trecho...`.
- O back agrupa os trechos do Whisper em parágrafos (pausa de 2 s ou mais, ou tamanho de 400 caracteres no fim de uma frase, ou 800 de qualquer jeito). Regras em `regras/back/video.md`.
- `src/shared/transcript.ts` é a fonte única do formato (o back grava e a tela lê): `TIMESTAMP_PREFIX`, `formatTimestamp`, `parseTimedTranscript`, `formatClock`, `buildVideoLink`, `supportsTimedLink`.
- **Documentos antigos** (sem o prefixo em todos os blocos) continuam como texto corrido, sem barra lateral. Nada é reescrito.

## Na tela (`TranscriptView`)
- Só páginas do tipo **Transcrição** passam por aqui (`DocumentPage`), na leitura normal e no modo leitura.
- **Texto inteiro, sem divisórias:** cada trecho começa com o horário em um chip de pontas hexagonais, seguido de uma barra de progresso que representa **todo o áudio**: a parte do áudio já percorrida (do começo até o início do trecho) fica preenchida em verde, um hexágono marca onde o trecho começa e uma faixa de cor diferente vai até onde ele termina (o início do próximo trecho; o último usa a duração média dos anteriores, via `excerptSpans`). A faixa enche conforme a rolagem passa pelo trecho (verde nos já lidos, cor de destaque no atual). Só um horário aparece (o do início). Não há barra vertical ao lado do texto. A barra lateral (`TranscriptRail`) foi compactada (linhas, margens e prévia menores).
- **Horário = link:** abre no navegador do sistema (`ExternalLink bare`). YouTube e Vimeo abrem no momento exato; links diretos de vídeo usam o fragmento `#t=`; outras plataformas abrem só o vídeo (e o `title` do chip avisa). Sem link de origem, o horário é só texto.
- **Barra lateral flutuante (`TranscriptRail`):** à esquerda do texto, acompanha a rolagem (`sticky`). Na página ela fica numa coluna própria (`railSlot`, via portal) na mesma linha do painel da direita, com a mesma largura (16rem) e a mesma posição fixa (`top-4`), então as duas barras ficam na mesma altura; no modo leitura ela vai para o lado do acompanhamento (esquerda, ou direita com "Inverter os lados"), que aparece ao passar o mouse na margem, com um hexágono por trecho ligados por uma linha que enche. Verde = lido, cor de destaque = atual. Tem o título "Linha do tempo" (o "Sumário" é só dos títulos das páginas) e o mesmo visual do cartão do Sumário (`sidebar-card`), para as duas colunas da esquerda ficarem iguais. Clicar num hexágono rola até o trecho. Com muitos trechos ela rola por dentro e mantém o atual à vista. Some em telas estreitas (`md`).
- **Ajustes da transcrição** (`appearance.transcript`, no mesmo nível de `reading`; Configurações > Aparência > Transcrição): `preview` (padrão ligado) mostra as 5 primeiras palavras de cada trecho ao lado do horário na barra lateral; `progress` (padrão ligado) mostra a barra de progresso na linha do tempo do áudio ao lado do horário. Fonte, tamanho, zoom e cores seguem a Leitura.
- O "atual" e o "lido" seguem **a sua rolagem no texto**, não o vídeo (não há player). A "linha de leitura" desce do topo ao fim da área conforme a rolagem avança (`readingLine`), então o primeiro trecho começa vazio e o último termina cheio.
- **Desempenho:** a rolagem escreve o quanto foi lido direto nos elementos (`--f` em cada trecho, `--g` na barra), sem renderizar o React a cada quadro; só a troca do trecho atual renderiza (`useExcerptProgress`).

## Testes
`src/shared/transcript.spec.ts`, `renderer/src/lib/transcript-progress.test.ts`, `transcript-text.test.ts`, `components/TranscriptView.test.tsx`, `ExternalLink.test.tsx`, `pages/library/DocumentPage.transcript.test.tsx` e os de `ReadingSettings`.
