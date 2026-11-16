# Identidade visual (Colmeia)

O app tem uma identidade própria, derivada do ícone: três hexágonos (uma colmeia). Os neutros são **cinzas puros e suaves** (sem tom de cor, nos dois temas; nada de preto ou branco absolutos) e a única cor é a de destaque, o ciano do ícone por padrão. Tema e cor são configuráveis em **Configurações > Aparência** e valem na hora, nas duas janelas, sem reiniciar.

## Tema e cor de destaque
- **Tema:** Sistema (padrão, acompanha o Windows), Claro (off-white) ou Escuro (grafite). Os tokens de neutros ficam em `global.css` sem croma (`oklch(L 0 0)`).
- **Cor de destaque:** ciano (padrão, a cor do ícone), azul, índigo, violeta, esmeralda, rosa e laranja (paleta do Tailwind).
- **Regra de uso:** tudo que é clicável ou ação usa a cor de destaque (`primary`): botões primários, links, item ativo do menu, foco, seleção, interruptores e progresso. O que não é clicável fica neutro. A **marca** (logo, hexágonos de carregamento, colmeia decorativa, cursor da Home) usa `brand`, que acompanha a mesma cor.
- Trocar a cor muda tudo junto, inclusive o carregamento. Não existe cor de destaque "fixa" em componente: use `primary`/`brand`, nunca `cyan-*` ou `blue-*`.

## Como funciona
- **Contrato** (`src/shared/contracts/appearance.ts`): `ThemeMode`, `AccentId`, `Appearance`, `DEFAULT_APPEARANCE` (`system` e `cyan`). Main e renderer usam as mesmas listas.
- **Main:** a aparência vive em `settings.json` (`appearance`), validada em `settings-validator.ts` (tema ou cor desconhecidos dão `VALIDATION`). Canais `appearance:get` e `appearance:update` (ver `ipc-canais.md`); `SettingsService.updateAppearance` não pede reinício.
- **Renderer:** `AppearanceProvider` (`components/AppearanceProvider.tsx`, `hooks/use-appearance.ts`, `lib/appearance.ts`) aplica no `<html>` a classe `dark` e o atributo `data-accent`. As cores são só CSS: tokens em `global.css` (`:root` claro, `.dark` escuro, um bloco `[data-accent="..."]` por cor, claro e escuro).
- **Sem "piscar":** `public/theme-init.js` (arquivo separado, a CSP bloqueia script inline) lê a cópia local (`localStorage`, chave `homelab.appearance`) antes do primeiro quadro. O valor salvo no main é a fonte da verdade e é relido ao abrir e a cada vez que a janela volta ao foco.
- **Entre janelas:** `BroadcastChannel` (`homelab-appearance`). No app empacotado as duas janelas têm a mesma origem (`app://front`) e a troca nas Configurações vale na hora no app principal. No modo dev (portas 5173 e 5174, origens diferentes) a janela principal atualiza ao voltar ao foco.
- **Pré-visualizar uma cor:** qualquer elemento com `data-accent="x"` e a classe `dark` recebe `bg-primary` naquela cor (as bolinhas das Configurações usam isso).

## Tela de abertura (loading de colmeia)
Enquanto o app abre, aparece a **mesma colmeia carregando** (`hex-loader`, na cor de destaque e no tema escolhidos):
- **Janelinha de abertura** (`splash.html`, `createSplashWindow` em `src/main/index.ts`): sem moldura, centralizada, sem item na barra de tarefas; abre antes de o main preparar o back e fecha quando a janela principal aparece (`ready-to-show`). Lê o tema e a cor pela cópia local (`theme-init.js`). Build de duas páginas (`vite.renderer.main.config.mts`: `index.html` e `splash.html`).
- **No #root do `index.html`** (`.boot-splash`): a colmeia fica na tela até o React montar, sem tela em branco no meio.
- **Modo dev (`npm run dev`):** o CSS do app só chega depois, por JavaScript, então estas páginas não dependem dele para ficar apresentáveis: `splash.html` carrega o CSS como `<link>` (bloqueia a primeira pintura), o SVG tem `width` e `height` explícitos e há um `<style>` crítico com o fundo do tema. Foi o que causava o ícone do tamanho da página.
- Os hexágonos dessas páginas estáticas repetem a geometria do `HexLoader` (o teste `renderer/src/splash.test.ts` confere que são iguais).
- Os fundos das janelas antes da primeira pintura seguem o tema do sistema (`windowBackground`: grafite ou cinza claro).

## Componentes da marca (`components/Hex.tsx`)
| Componente | Uso |
|---|---|
| `Logo` | três hexágonos (dois neutros, um em `brand`); topo da sidebar e das Configurações |
| `HexLoader` | carregando: os hexágonos acendem em sequência (`LoadingState`) |
| `HexDot` | ponto de status hexagonal (serviços, status do sistema) |
| `HexFrame` | moldura hexagonal do ícone de estados vazios e de erro |
| `HoneycombBackdrop` | colmeia decorativa a 7% (Home) |
| `hexPath` | caminho SVG de um hexágono |

## Mesma UI nas duas janelas
A janela de Configurações usa os **mesmos componentes e transições** do app: menu = `Sidebar` da UI (item ativo colorido com transição), seção que entra com `animate-enter-fade`, cards com `animate-enter` em cascata, `ProviderCard` (recolhível), `Snackbar`, `SetupGuide` e `ExternalLink`, todos em `renderer/src/components`. **Fonte única:** `renderer/src/ui` e `renderer/src/components`; antes de criar algo, procure ali (ver `CLAUDE.md`).

## Passo a passo de configuração (`SetupGuide`)
Serviços externos têm um guia numerado (ex.: como criar a chave do Gemini, com link para o AI Studio) que aparece enquanto o serviço **não** está configurado e se recolhe com transição depois que a chave é salva. Para um serviço novo, acrescente uma entrada em `EXTERNAL_PROVIDER_GUIDES` (`renderer/settings/src/strings.ts`) e, se houver painel de consumo, em `lib/provider-consoles.ts`.

## Páginas de papel
`PaperPage variant="sheet"` desenha uma folha de papel de verdade (papel claro com tinta escura mesmo no tema escuro, serifa, sombra em camadas, número no rodapé); o texto dentro usa `MarkdownMessage tone="paper"`. Em **Páginas**, a página aberta é uma folha (`PaperPage variant="sheet"`) e a lista na visualização Grade (padrão) mostra **miniaturas de página** (`DocumentCard variant="grid"`, `PaperPage size="thumb"`: retrato 3:4, canto dobrado, categoria, título, prévia, tags e data), do mesmo jeito que Livros mostra capas. **Mesmo tamanho:** a miniatura tem exatamente o tamanho da capa de livro (`max-w-44` = 176 × 235 px) e a grade usa as mesmas colunas e espaços de Livros; mude os dois juntos. Os livros têm a visualização **Páginas** (cada capítulo numa folha), escolhida por `OptionToggle` e lembrada neste computador.

Outros detalhes: rótulos de grupo e de caminho em fonte mono (`ui-monospace`/Cascadia, sem dependência nova), item ativo da sidebar (achado por `findActiveUrl`, o endereço mais específico) com fundo `primary/15`, barra lateral e transição de cor, cards clicáveis com anel `primary` no hover, raio de borda 0,5 rem e `favicon.svg` com o ícone.

## Padrão das telas de Configurações
Toda seção usa `SettingsGroup` (título mono em maiúsculas, dica e conteúdo) e `SettingsPanel` (caixa de borda fina com fundo de card; `highlight` para o item ativo); `ProviderCard` e `ComponentChecklist` seguem a mesma caixa. Seção nova: agrupe com `SettingsGroup`, não crie outro visual.

## Modais, conversa e barras de ação
- **Modais** (`ui/dialog.tsx`): só o miolo rola. `DialogHeader` (título e subtítulo) e `DialogFooter` (confirmar e cancelar) são `sticky`, mesmo dentro de um `<form>`; o botão de fechar fica fora do miolo. `bodyClassName` ajusta o miolo (ex.: paleta de comandos, sem padding). Não coloque `overflow` nem `max-h` no `DialogContent`.
- **Conversa:** a página tem altura fixa (`100dvh - 5,5rem`); só a lista de conversas e o conteúdo da conversa rolam, e o campo de mensagem fica sempre embaixo, flutuando sobre a página.
- **Barra de ações fixa** (ex.: Nova página): `sticky bottom-0` com `-mb-4` (o respiro do layout), para não subir ao chegar ao fim do scroll.
- **Item de job** (`JobPipeline`): o interior é um pipeline em estilo terminal, com um marcador hexagonal por etapa (verde, cor de destaque pulsando, vermelho ou neutro), estado ao lado, barra fina na etapa em execução, erro em destaque e início, fim e duração.

## Ao criar componente novo
1. Cor de ação: `bg-primary`, `text-primary`, `ring-ring` (ou o `Button` padrão). Texto em destaque sobre fundo: `text-brand-text`. Marca: `text-brand`, `fill-brand`.
2. Status: `HexDot` com a cor do estado (verde, âmbar e vermelho não mudam com o destaque).
3. Estado vazio ou de erro: `EmptyState`/`ErrorState` (já trazem a moldura).
4. Carregando: `LoadingState` (`inline` quando for pequeno).

Testes: `lib/appearance.test.ts` (modos, `data-accent`, cache, blocos de tokens por cor), `hooks/use-appearance.test.tsx`, `components/Hex.test.tsx`, `settings/src/sections/AppearanceSection.test.tsx` e os de `settings` no main (store, validador, serviço e handler).

## Mensagens (Snackbar) e cabeçalho de página
- **`Snackbar`** (`components/Snackbar.tsx`) é a única forma de avisar resultado de uma ação. `useSnackbar()` expõe: `success(msg)` (ou `show`) e `error(msg)` no **canto inferior direito**; `created(msg, { label, onClick })` **embaixo no centro**, para quando algo foi criado (ex.: "Tarefa criada", com o atalho "Acompanhar"). Todas têm barra de progresso que se esgota no tempo em tela (3 s; erro 6 s). Uma mensagem por região: a nova substitui a anterior. `success` e `created` aceitam um botão (ex.: "Desfazer" depois de excluir jobs, "Acompanhar" depois de criar uma tarefa). Avisos persistentes (job que falhou, disco) continuam no `NoticeCenter`.
- **`PageHeader`** (`components/PageHeader.tsx`): prompt de terminal (`root@homelab:~$ comando`), título, descrição, linha de status mono e ações. O **título é sempre o texto do item da sidebar** (Início, Páginas, Livros, Caixa de entrada, Nova página, Nova tarefa, Em andamento, Consumo). Usado em todas as telas do menu (menos Conversa e Início, que têm layout próprio).
- A Início usa um painel de terminal (barra com hexágonos, `./home --status`); o nome do usuário não aparece: o texto é genérico.
