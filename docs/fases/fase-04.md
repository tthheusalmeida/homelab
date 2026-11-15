# Fase 04 — Health e AI (leitura)

Status: pendente

## Objetivo
Primeiros domínios por IPC, só leitura, para validar a ponte de ponta a ponta.

## Escopo
- Handlers: `HealthHandler` (`health:system`, `health:ai`) e `AiHandler` (`ai:providers`, `ai:models`, `ai:thinking`, `ai:usage`).
- Front: trocar o corpo dos `api` de Home (health, hoje `fetch` direto), chat (providers/models/thinking) e usage. Assinaturas e hooks iguais.
- Atualizar `front/doc/lib.md`, `front/doc/home.md` e `docs/ipc-canais.md` se algo mudar.

## Testes unitários
- Handlers com `IpcMainLike` falso e services mockados: caminho feliz e cada erro mapeado.
- Provider fora do ar vira `error` no check, sem derrubar `health:ai` (regra em `back/doc/chat-health.md`).
- Front: `api` migrados mockando `window.api`.

## O que testar
1. Home: os cartões `system` e `ai` mostram o mesmo status de antes; desligue o Ollama e veja `error` só nele.
2. Chat: a lista de providers e modelos aparece; trocar de modelo atualiza as opções de thinking.
3. Uso de IA: números, filtro por provider e gráficos como antes.
4. Provider sem configuração: mensagem clara, sem tela quebrada.

## Critério de aceite
Home, seleção de modelo do chat e Uso funcionam 100% por IPC, sem chamadas HTTP para esses domínios (conferir na aba Network).
