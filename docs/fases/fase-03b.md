# Fase 03b — Janela de Configurações e item na barra lateral

Status: pendente

## Objetivo
Interface para configurar pastas e providers, em uma janela própria com o tema do app, aberta por um item no rodapé da barra lateral. Usa os canais da fase 03a.

## Decisão do usuário
- Janela separada de Configurações, bonita e com o tema da UI do app (equivalente a uma tela dentro de uma rota).
- Item "Configurações" no **rodapé da barra lateral** que abre essa janela.

## Escopo
- **Build do renderer no desktop** (Vite com raiz em `../front`, sem editar o front): aliases que trocam módulos do front por versões do desktop. É a mesma base que as fases 04 a 08 usam para trocar os `api.ts` por IPC.
- **`AppSidebar` do desktop:** cópia do `AppSidebar.tsx` do front com o item de rodapé. Para evitar que fique desatualizada, um teste compara um hash do arquivo original (guardado no desktop) e **falha avisando** quando o front mudar.
- **Janela de Configurações:** página React própria no desktop, reaproveitando `#ui/*`, `#components/*` e o `global.css` do front por alias (mesmo tema, claro/escuro). Seções: Pastas, Providers externos, Providers locais. Botões Salvar e Testar com resultado visível; aviso "Reiniciar para aplicar" com botão "Reiniciar agora" (`app:relaunch`).
- **Abertura:** item de rodapé (novo canal `app:open-settings`), atalho `Ctrl+,`/`Cmd+,` e, na primeira execução sem chave do Gemini, abre sozinha.
- Mensagem do front para erro `NOT_CONFIGURED` apontando para Configurações.

## Testes previstos
- Componentes da tela (Pastas, Providers): carregar, editar, salvar, testar, erros e aviso de reinício, mockando `window.api`.
- Handler de `app:open-settings` e opções da janela (flags de segurança).
- Verificação de desvio da cópia do `AppSidebar`.

## O que testar (previsto)
1. O rodapé da barra lateral mostra "Configurações" e abre a janela.
2. Alterar pasta e URL do Ollama, salvar, ver o aviso de reinício e reiniciar.
3. Informar a chave do Gemini, testar e salvar; reabrir e ver "configurada" com a chave mascarada.
4. Testar Whisper, Ollama e ffmpeg e ler os resultados.
5. Primeira execução sem chave: a janela abre sozinha.

## Critério de aceite
Todas as configurações editáveis pela interface, com o visual do app, sem tocar no `.env`.
