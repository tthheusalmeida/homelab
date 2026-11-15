# Migração para Electron + IPC

## Objetivo
- Transformar o HomeLab (front React + back Nest) em app desktop com Electron, trocando HTTP por IPC.
- Mesmo comportamento de hoje. Nada de melhoria de produto: o que já funciona continua funcionando.
- O `.env` deixa de existir; pastas, URLs e chaves são configurados pela interface.
- Windows primeiro. Linux e macOS depois, com a estrutura já preparada.

## Decisões
- **Nest como contêiner de DI** no processo main (`createApplicationContext`). Services, DTOs de domínio e testes do back são reaproveitados; os 6 controllers viram handlers IPC.
- **Handlers em classes** (SOLID/clean code), com constantes para canais, erros e mensagens. Ver `arquitetura.md`.
- **Contratos em `desktop/src/shared`**: canais e tipos usados por main e front. O front importa por alias.
- **Migração gradual (strangler)**: até a fase 08 o Nest servia HTTP e IPC juntos. Cada domínio migrado trocou só o `api.ts` do front; hooks e componentes não mudaram. Na 09a o HTTP acabou.
- **Settings no lugar do `.env`**, com `safeStorage` para segredos. O app sobe sem configuração; o que faltar gera erro `NOT_CONFIGURED` e o front leva à tela de Configurações. Ver `configuracoes.md`.
- **Providers separados**: externos (Gemini e outras IAs) e locais (Whisper, Ollama, ffmpeg).
- **Whisper por plataforma**: `resources/bin/<platform>-<arch>/`; só `win32-x64` agora. O modelo (1,5 GB) não vai no instalador.
- **Renderer do desktop:** desde a 09b o renderer é o próprio front, copiado em `renderer/src`, com Vite/Vitest/React instalados no desktop e IPC nos `api.ts`. O mecanismo de overrides (fases 03b a 08) foi removido. Detalhes em `arquitetura.md`.
- **Jobs continuam por polling de 1 s** e **em memória**, como hoje. Persistir ou usar eventos é melhoria, fora do escopo.
- **`back/` e `front/` não são alterados** (decisão do usuário): as fases 00 a 08 implementaram tudo em `desktop/`, que só os lia e rodava seus builds, com overrides próprios.
- **Independência (decisão do usuário na fase 09):** o desktop **absorve** o código do back (09a) e do front (09b) e deixa de ler `../back` e `../front`. Os dois repositórios antigos ficam como estão, sem manutenção ("eles vão acabar"). Submódulo e monorepo foram descartados. Documentação e regras de negócio também passam a viver em `desktop/docs`.

## Fases e status

| Fase | Entrega | Status |
|---|---|---|
| 00 | Linha de base e inventário de canais | concluída |
| 01 | Casca Electron com o front atual (HTTP como hoje) | concluída |
| 02 | Infra IPC (`shared`, `IpcHandler`, registrar, preload tipado, `app:*`) | concluída |
| 03a | Núcleo de configuração: Settings, segredos, providers externos e locais (por IPC) | concluída |
| 03b | Janela de Configurações e item no rodapé da barra lateral | concluída |
| 04 | Health e AI (leitura) | concluída |
| 05 | Chat | concluída |
| 06a | Biblioteca, leitura | concluída |
| 06b | Biblioteca, escrita | concluída |
| 07a | Livros, leitura | concluída |
| 07b | Livros, escrita | concluída |
| 08 | Jobs e resolvedor do Whisper (win32) | concluída |
| 09a | Back dentro do desktop: sem HTTP, sem `.env`, sem ler `../back` | concluída |
| 09b | Front dentro do desktop: mesma estrutura de pastas, sem overrides nem `fetch` | concluída |
| 09c | Limpeza final, smoke E2E, usuário novo e docs consolidados | pendente |
| 10 | Empacotamento Windows | pendente |

Cada fase tem um arquivo em `docs/fases/` com escopo, testes e checklist. Status: `pendente`, `em andamento`, `aguardando validação` (entregue, esperando o "ok") ou `concluída`.

## Regra de entrega
- Uma fase por vez. A seguinte só começa com o "ok" do usuário.
- Cada fase entrega código, testes unitários, `docs/` atualizado e o checklist manual.
- O app nunca fica quebrado entre fases: o que não migrou continua por HTTP.
- Ao terminar, a resposta diz que terminou e lista "O que testar".

## Fora do escopo
- Persistência de jobs e usage, eventos de progresso por IPC, novos tipos de job, mudanças de UI além de Configurações.
- Binários de Whisper para Linux e macOS, assinatura e notarização.
- Auto-update.
