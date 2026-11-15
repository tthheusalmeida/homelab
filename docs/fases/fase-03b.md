# Fase 03b — Janela de Configurações e item na barra lateral

Status: concluída

## Objetivo
Interface para configurar pastas e providers, em uma janela própria com o tema do app, aberta por um item no rodapé da barra lateral. Usa os canais da fase 03a. **Sem alterar `back/` nem `front/`.**

## Decisão do usuário
- Janela separada de Configurações, bonita e com o tema da UI do app.
- Item "Configurações" no rodapé da barra lateral que abre essa janela.
- Após a primeira validação: "Salvo" como snackbar no canto inferior direito; cada item (Whisper, Ollama, Gemini, ffmpeg…) recolhível, com só uma descrição sob o título; corrigir os avisos do Electron (`safeStorage` obsoleto e CSP).

## Escopo
- **Build do renderer no desktop** (Vite do front, configs no desktop): é a base que as fases 04 a 08 usam para trocar os `api.ts` por IPC.
- **Janela de Configurações** (`renderer/settings`): seções Pastas, IAs externas e Serviços locais, com Salvar/Testar, seletor de pasta nativo, resultado dos testes, snackbar e aviso "Reiniciar agora".
- **`AppSidebar` do desktop** (`renderer/overrides`): cópia do arquivo do front com o item de rodapé.
- **Abertura:** item do rodapé (`app:open-settings`), atalho `Ctrl+,`/`Cmd+,` nas duas janelas e abertura automática na primeira execução sem chave do Gemini.
- Canais novos: `app:open-settings` e `settings:pick-folder`.

## Decisões (registradas na entrega)
- **Dois builds do renderer, uma pasta de saída (`dist-renderer`):** o principal (raiz em `front/`, com módulos trocados) e o das Configurações (`dist-renderer/settings/`, `base: './'`). Em dev, dois servidores: `5173` e `5174`.
- **Módulos trocados (`overrides`):** a fonte única é `renderer/overrides/overrides.lock.json` (arquivo do front → cópia do desktop + hash do original). O plugin do Vite lê esse arquivo e redireciona o módulo, sem tocar no front.
- **Proteção contra desatualização:** o teste `overrides-lock.spec.ts` e `npm run overrides:check` comparam o hash do arquivo do front com o registrado; se o front mudar, falham dizendo qual arquivo reconciliar. Depois, `npm run overrides:update`. CRLF/LF é ignorado.
- **Uma só cópia do React:** os arquivos do desktop resolvem pacotes a partir de `front/node_modules` (plugin `resolveFromFront` e aliases). Na janela de Configurações também há aliases explícitos para `react` e `react-dom`, porque o pré-empacotador do Vite resolve sem passar pelos plugins.
- **Aliases** `#ui/*`, `#components/*`, `#lib/*`, `#hooks/*` e `@front/*` apontam para `front/src`.
- **Tema:** a janela importa o `global.css` do front e o Tailwind escaneia `front/src/ui` e `front/src/components`; sem isso cards, botões e inputs saíam sem estilo.
- **Itens recolhíveis:** `ProviderCard` (usa o `collapsible` do front). Fechado mostra título, selo de status (ex.: "Configurada") e **uma** descrição; clicar abre os campos. O que foi digitado não se perde ao recolher. A seção Pastas continua um formulário único (as quatro pastas são salvas juntas).
- **Snackbar:** `SnackbarProvider`/`useSnackbar` no canto inferior direito, some em 3 s, tem botão de fechar e uma nova mensagem substitui a anterior. Sobe (`bottom-20`) enquanto o aviso de reinício está visível, para não cobrir o botão "Reiniciar agora". Erros de validação continuam inline.
- **`safeStorage` assíncrono:** `encryptStringAsync`/`decryptStringAsync`/`isAsyncEncryptionAvailable` no lugar da API obsoleta. Por isso `SecretStore`, `ExternalProvidersService` e a importação do `.env` ficaram assíncronos. Se o sistema pedir (`shouldReEncrypt`), o segredo é regravado com a chave nova; falha ao regravar não impede a leitura.
- **Política de segurança de conteúdo (CSP):** `buildContentSecurityPolicy` aplicada por cabeçalho nas duas janelas: no build, na resposta do protocolo `app://`; no dev, pelo `webRequest` do Electron. **Nunca** permite `unsafe-eval`. Build: `script-src 'self'`. Dev: também `unsafe-inline` (preâmbulo do React Refresh) e as origens/WebSockets do Vite. `connect-src` libera o HTTP local (porta do Nest) até a fase 09. Imagens aceitam `http:`/`https:` porque a biblioteca e as capas de livros usam URLs externas.
- **Reiniciar para aplicar** continua valendo (ver 03a).
- **IDE:** `renderer/tsconfig.json` (estende `tsconfig.renderer.json`) para o editor entender os arquivos do renderer; o ESLint do main ignora `renderer/` e `*.mts`.

## Testes
- **Jest (220 no total):** janela de Configurações (opções), `SingleWindowController`, atalho, `needsInitialSetup`, `FolderPicker`, `app:open-settings`, alvo de URL, mecanismo de lock, CSP (política e cabeçalhos), `SecretStore` assíncrono (inclusive `shouldReEncrypt`), serviços de providers.
- **Vitest do renderer (52):** `npm run test:renderer` — Pastas, IAs externas, Serviços locais (cards recolhíveis), `ProviderCard`, `Snackbar` (posição, tempo, fechar, substituição, `raised`), navegação, aviso de reinício e a cópia do `AppSidebar`.
- **Tipos do renderer:** `npm run typecheck:renderer`.

## Verificado nesta entrega
Execução real do Electron, inspecionada por CDP e por screenshots, com `userData` temporário, em **build** e em **dev**:
- **CSP:** cabeçalho presente nas duas janelas, sem `unsafe-eval`; **nenhum** aviso "Electron Security Warning" no console nem na saída do Electron; a API (`http://localhost:3000`) segue acessível sob a política e a Home carrega.
- **`safeStorage`:** nenhuma mensagem de depreciação na saída do Electron (a chave do Gemini é lida/gravada pela API assíncrona).
- **Controle:** confirmei que a captura do console reproduz mensagens anteriores à conexão (apareceram as do Vite e um `console.warn` de teste), então a ausência do aviso é um resultado válido.
- **Snackbar:** "Salvo" aparece a 16 px da direita e 16 px do fundo (80 px quando há aviso de reinício) e some após 3 s.
- **Cards:** abrem e recolhem (`aria-expanded`), com uma descrição sob o título; screenshots conferidos.
- **Não verificado por mim:** o seletor de pasta nativo, o botão "Reiniciar agora", o atalho `Ctrl+,` e o HMR do Vite (a CSP libera o WebSocket, mas não editei arquivos com o app aberto).

## O que testar
1. `npm run dev`: o terminal **não** deve mais mostrar "Electron Security Warning" nem "safeStorage.decryptString is deprecated". Se aparecer qualquer outro aviso, me mande o texto.
2. Use o app normalmente (Home, Biblioteca, Chat, Jobs, Livros com capa, um documento com imagem): tudo deve funcionar como antes. Se alguma imagem externa ou recurso deixar de carregar, pode ser a CSP: me diga a tela.
3. Abra **Configurações** pelo rodapé da barra lateral. Em **IAs externas** e **Serviços locais** os itens aparecem recolhidos (nome, selo e uma descrição). Clique em cada um para abrir e clique de novo para recolher.
4. Abra o **Ollama**, mude a URL, recolha e abra de novo: o que você digitou continua lá.
5. Salve uma alteração (ex.: URL do Ollama). Esperado: um snackbar "Salvo" no canto inferior direito, que some sozinho em 3 s, e o aviso de reinício no rodapé **sem** o snackbar cobrir o botão "Reiniciar agora".
6. **Pastas:** escolha uma pasta pelo ícone e salve; um caminho relativo (`abc`) continua dando erro em português, sem snackbar.
7. Teste Whisper, Ollama e ffmpeg e a chave do Gemini como antes.
8. Com o aviso visível, clique em **Reiniciar agora** (no `npm start` reabre; no `npm run dev` só fecha).
9. Edite um arquivo do front com o `npm run dev` aberto e veja se a tela atualiza sozinha (HMR).

## Critério de aceite
Todas as configurações editáveis pela interface, com o visual do app, itens recolhíveis, confirmação por snackbar e sem avisos de segurança ou depreciação do Electron; sem tocar no `.env`, no `back/` nem no `front/`.
