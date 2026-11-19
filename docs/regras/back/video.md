# Vídeo, Whisper e arquivos (modules/video, ai/whisper)

## Download
- Só http e https; outro protocolo rejeita com "Informe um link que comece com http:// ou https://".
- **Link direto** (extensão de vídeo ou áudio): download HTTP próprio, descrito abaixo. **Outro link**: yt-dlp, só o áudio (`PlatformDownloader`); login exigido vira `AccessRequiredError`. Quando o back não recebe `platformTools` (testes), tudo vai pelo download direto. Ver `docs/download-de-videos.md`.
- Segue redirecionamentos 3xx; o `Location` pode ser absoluto ou relativo (resolvido contra a URL atual).
- Status diferente de 200 rejeita com "Falha ao baixar. Status Code: N" e apaga o arquivo parcial.
- Erro de rede/escrita rejeita com mensagem específica e apaga o arquivo parcial.
- Destino padrão: `TEMP_VIDEO_DIR`; a pasta é criada se não existir.

## Conversão para áudio
- Usa `ffmpeg` (precisa estar no PATH): sem vídeo, mono, 16 kHz, WAV PCM 16 bits.
- O áudio tem o mesmo nome do vídeo com extensão `.wav`, em `TEMP_AUDIO_DIR`.
- Falha vira "Falha ao converter o vídeo para áudio".

## Transcrição (Whisper)
- Usa o executável `WHISPER_EXECUTABLE` e o modelo `WHISPER_MODEL`, ambos em `WHISPER_DIR`, idioma `pt`.
- Valida antes: executável, modelo e arquivo de áudio devem existir; senão erro específico e o whisper não roda.
- Lê o `.txt` gerado, devolve o texto sem espaços nas pontas e **sempre** tenta apagar o `.txt` (falha ao apagar é ignorada).
- Falha do whisper vira "Falha ao transcrever o áudio".
- **Com tempo (`transcribeSegments`)**: mesma execução, mas com `--output-json`; lê os trechos (início e fim em ms, texto) e apaga o `.json` no fim. JSON inválido ou sem `transcription` vira a mesma falha "Falha ao transcrever o áudio". O resumo continua usando só `transcribe` (texto).
- **Documento de transcrição (job `video-to-transcript`)**: os trechos viram **parágrafos** (`timed-transcript.ts`) e cada parágrafo começa com o instante em que a fala iniciou, no formato fixo `[HH:MM:SS] texto`, separados por linha em branco. Um parágrafo novo começa quando a pausa entre trechos é de 2 s ou mais, quando o atual passou de 400 caracteres e terminou uma frase, ou quando passou de 800. A assinatura "Legenda por ..." sai do último parágrafo (e o parágrafo some se só tinha ela). O vídeo continua sendo apagado depois de virar áudio: o tempo serve para abrir o link original no momento certo, não para guardar o vídeo.
- **Documentos antigos** (sem o prefixo `[HH:MM:SS]`) não são reescritos: só a exibição os trata como texto corrido. `TIMESTAMP_PREFIX` é o padrão que a tela usa para reconhecer o tempo.

## Salvar arquivo
- Grava `nome + extensão` em UTF-8; a extensão padrão é `.md` e a pasta padrão é `TEMP_DOCS_DIR` (criada se não existir); devolve o caminho.

## Resumo
- Monta o prompt seguido da transcrição e envia ao `AIService.chat`. O prompt depende do **nível de detalhe** (`buildSummaryPrompt`): `brief` (prompt original, resumo curto), `detailed` (padrão; preserva conceitos, explicações, comandos e exemplos) e `study` (material de consulta quase completo, com agrupamentos Conceitos-chave / Passo a passo / Comandos e exemplos / Pontos de atenção / Para revisar, só com o que existir na fonte). Os três mantêm as regras de fidelidade à fonte; muda só a seção "NÍVEL DE DETALHE".
- Em `detailed` e `study`, transcrições com mais de 12000 caracteres são divididas em partes (`splitText`, cortando no fim de frases); cada parte é resumida em uma chamada (com a nota "parte i de n"; da 2ª em diante, sem repetir o título principal) e os resumos são juntados com linha em branco. `brief` sempre vai em uma chamada só.
- `thinking` assume `off` se não informado.
- Falha vira "Falha ao gerar o resumo." **seguida do motivo** da IA (ex.: "Falha ao gerar o resumo. O limite de uso do Gemini foi atingido..."), para o usuário saber se foi limite, serviço fora do ar, chave ou modelo.
- Enquanto o provider tenta de novo, o processor grava no job o aviso "Tentando de novo (tentativa x de y): motivo" (`Job.setNote`, não vai para o disco), que a tela mostra na linha ao vivo e que some quando a etapa muda.

## Apagar temporários
- `deleteVideo`/`deleteAudio` removem o arquivo; se não existir, lançam erro específico (vídeo ou áudio).

## Utilitários de texto
- `normalizeText`: quebras de linha viram espaço, espaços repetidos viram um, remove espaços das pontas.
- `removeAllegedAuthorship`: remove "Legenda por Sônia Ruberti" (com ou sem ponto, qualquer caixa) **apenas no final** do texto.
