# Fase 05 — Chat

Status: pendente

## Objetivo
Enviar mensagem ao modelo por IPC.

## Escopo
- `ChatHandler` (`chat:send`) delegando ao `ChatService`.
- Front: `useAiChat` passa a usar o `api` migrado (`chat.ts`), mantendo cancelamento e animação como estão (ver `front/doc/chat.md`).
- Registrar no mapper o erro de provider (`PROVIDER_FAILED`) preservando a mensagem atual.

## Testes unitários
- Handler: caminho feliz; falha de provider (Gemini e Ollama) vira `PROVIDER_FAILED`; provider sem configuração vira `NOT_CONFIGURED`.
- Front: envio, erro e cancelamento mockando `window.api`.

## O que testar
1. Conversar com um modelo do Gemini e outro do Ollama, com e sem thinking.
2. Derrubar o Ollama e enviar: erro legível na tela.
3. Conferir em Uso de IA que a requisição foi contabilizada (e a falha também).

## Critério de aceite
Chat idêntico ao de antes, sem HTTP.
