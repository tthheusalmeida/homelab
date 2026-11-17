# Desempenho (PCs fracos)

Regra: **otimizar sem tirar o que deixa o app gostoso de usar**. Transições, fades, o efeito de carta (`TiltCard`), o desfoque dos diálogos e o `prefers-reduced-motion` ficam como estão (ver `movimento.md`). Só entram mudanças que cortam trabalho invisível.

## O que foi feito
- **Telas carregadas sob demanda** (`renderer/src/app/router.tsx`). Antes o app abria lendo **um arquivo de 1,4 MB** (430 KB comprimido) com todas as telas, o gráfico de consumo (recharts, ~380 KB) e o renderizador de Markdown. Agora a abertura lê **~460 KB**; cada tela é um arquivo separado.
  - A Início e o layout (barra lateral, cabeçalho) continuam no arquivo principal: o app aparece sem esperar nada.
  - O roteador espera o arquivo da tela chegar **antes** de trocar, então não há flash nem tela em branco; a transição de entrada (`animate-enter-fade`) é a mesma.
  - `preloadRoutes` (chamado no `App`) baixa as outras telas **em segundo plano, uma por vez e só quando o app está ocioso** (`requestIdleCallback`), então depois de alguns segundos qualquer tela abre na hora. Falha ao baixar não derruba nada: a tela tenta de novo ao ser aberta.
  - Ao criar uma tela nova, acrescente-a em `loaders` e na lista de rotas com `lazyRoute`. `router.test.tsx` confere que todo nome exportado existe.
- **Lista de tarefas sem consulta de 1 em 1 segundo à toa** (`useJobs`). O contador da barra lateral consultava a lista todo segundo, o tempo todo. Agora: com algo na fila ou rodando, continua a cada 1 s (o progresso segue igual); sem nada em andamento, a cada 5 s. Criar uma tarefa (e cancelar, repetir, excluir) já atualiza a lista na hora, então não há atraso perceptível.
- **Relógio do cabeçalho** (`ClockAndTime`): os formatadores de data e hora são criados uma vez (antes, a cada segundo) e a linha da data só é refeita quando o dia muda.

## Como medir de novo
- Tamanho da abertura: `npx vite build --config vite.renderer.main.config.mts` e olhar `main-*.js` (hoje ~460 KB; antes 1,4 MB).
- Se o arquivo principal voltar a crescer muito, alguma tela foi importada direto no `router.tsx` em vez de entrar em `loaders`.

## Ideias que **não** foram aplicadas (mexem na aparência ou pedem medição no Windows)
- Tirar o desfoque (`backdrop-blur`) de diálogos e painéis: ajuda GPUs fracas, mas muda o visual.
- `will-change`/`transform-gpu` fixo nos cartões da biblioteca: com muitos itens ocupa memória de vídeo; tirar pode borrar o texto no começo do hover.
- Subconjuntos de fonte: o CSS declara todos os alfabetos (cirílico, grego, vietnamita), mas o navegador só baixa o que o texto usa; podar economiza só alguns KB de CSS e arrisca símbolos gregos em textos de ciência.
- Cache de código do V8 e opções de linha de comando do Electron: precisam ser medidos num PC fraco de verdade.
