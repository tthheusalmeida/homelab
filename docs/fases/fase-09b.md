# Fase 09b — Front dentro do desktop

Status: concluída

## Objetivo
O renderer do desktop passa a ser **o próprio front**, sem ler `../front`, sem overrides e sem `fetch`. (Decisão do usuário: manter a **mesma estrutura de pastas**, os componentes por rota e a base de componentes que nasce da pasta `ui`.)

## Escopo planejado
- Copiar `front/src` para `renderer/src` mantendo a estrutura: `app`, `pages/<rota>` (cada uma com `api`, `hooks`, `components`, `types`), `components` (base próprios, construídos sobre `ui`), `ui` (primitivos shadcn/base-ui), `lib`, `hooks`, `test`; mais `index.html`, `public`, CSS e fonte. ~162 arquivos de código e 99 de teste.
- **Aplicar o IPC no lugar** dos `api.ts` (as cópias de `renderer/overrides` viram os próprios arquivos) e apagar o mecanismo de overrides: `overrides.lock.json`, `front-bridge`, a CLI e o teste de hash.
- Remover o `fetch` de `#lib/api`, o `VITE_API_URL` e o `.env` do front.
- Dependências do renderer no `package.json` do desktop (React 19, Vite, Vitest, Tailwind 4, TanStack Query, React Router 7, base-ui, lucide, markdown, recharts…), com configs próprias de Vite/Vitest/TypeScript, e a janela de Configurações reaproveitando os componentes locais.
- Aliases `#ui`, `#components`, `#lib`, `#hooks` apontando para `renderer/src`.
- Atualizar o `desktop/CLAUDE.md` (some a regra "nunca instalar React no desktop" e a de overrides).

## Testes
Suítes do renderer (as 99 do front, adaptadas) e do main; typecheck do renderer; build do renderer e Electron real com as telas abertas.

## O que testar
Regressão visual e funcional de todas as telas (Home, Chat, Uso, Biblioteca, Livros, Jobs, Configurações), sem requisição HTTP.


## Como ficou
- `front/src` copiado para `renderer/src` (sem `assets`, que ninguém usa), mais `index.html` e `public`. Os `api.ts` (e `useAiChat`, `AppSidebar`) por IPC viraram os próprios arquivos; os testes dos overrides foram para ao lado de cada um.
- Removidos: `renderer/overrides`, `overrides.lock.json`, `renderer/vite/front-bridge.mts`, `src/overrides` (CLI e teste de hash), `lib/api.ts` (`fetch`), `VITE_API_URL` e os testes que simulavam `fetch`.
- Home: `services.types.ts` guarda o `healthChannel` de cada serviço em vez de URL; `checkService(channel)`. **Mudança de comportamento (inevitável):** a setinha de link do `ServiceCard` foi removida, porque apontava para um endereço HTTP que não existe mais.
- Aliases novos: `#shared/*` e `#test/*`; `renderer/src/lib/ipc.ts` (antes `renderer/ipc.ts`) e `renderer/src/test/api-mock.ts` (antes dentro das Configurações).
- Instalação com `npm install --legacy-peer-deps` (conflito de peer do Babel entre Jest e o plugin React do Vite) e `@testing-library/dom` como dependência explícita.
- Verificação: typecheck do renderer limpo; Vitest 104 arquivos / 1047 testes; Jest 74 suítes / 847 testes (eram 75 / 860: saiu o teste de hash dos overrides); build do renderer e do main; Electron real com Início, Chat, Uso, Biblioteca e Jobs sem erro de console e sem recurso `http(s)`.
- Sob carga (`--pool=vmThreads`) dois testes de `BookPage.progress` já falharam por tempo; isolados passam (49/49).