# Fase 05 — Chat

Status: concluída

## O que foi feito
- Canal `chat:send` (`shared/channels.ts`, `shared/contracts/chat.ts`) e `ChatHandler` (porta `ChatSource`), que converte falha de provider em `PROVIDER_FAILED`.
- O front não usava o `chat.ts` para enviar: o `useAiChat` chamava `api("/chat", { signal })` direto. Por isso o override é do **hook** (`renderer/overrides/use-ai-chat.ts`), mesma API (`sendMessage`, `abort`, `isSending`). Cancelar rejeita com `DOMException` `AbortError`, que a `ChatPage` já trata.
- **Correção que vale também para a fase 04:** `ai:usage` lia a cópia do `AiUsageService` do `VideoModule`, não a do `AIModule` (a que o chat usa), e mostrava sempre 0. Agora cada service é resolvido dentro do módulo certo (`BackServices` + `NestHost.get(token, módulo)`).
- Verificado no Electron real (CDP, dados isolados): Gemini responde, Ollama fora do ar vira `PROVIDER_FAILED`, o Uso contabiliza sucesso e falha (igual ao HTTP), envio e cancelamento pela interface funcionam e nenhuma requisição HTTP sai.
- Comportamento que já existia e não mudou: erro de envio não mostra mensagem na tela (só `console.error`), e com o Ollama fora do ar não há modelo, então o botão de enviar fica desabilitado até trocar o provider.

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
