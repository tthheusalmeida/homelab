# Fase 09a — Back dentro do desktop

Status: concluída

## Objetivo
O desktop passa a **conter** o back e deixa de depender de `../back`, do HTTP e do `.env`. (Decisão do usuário: "cortar o cordão umbilical"; o repositório `back` fica como está, sem manutenção.)

## O que foi feito
- **Código do back copiado para `src/back`**, mesma estrutura de módulos (`modules/{ai,chat,health,jobs,library,video}`, `utils`): 50 arquivos de código e 32 suítes de teste (521 testes), com os imports `src/...` reescritos para relativos. Ficaram de fora: controllers, Swagger, CORS, `main.ts`, `app.module.ts`, `config/env` (`AppConfig`, `EnvKeys`, `env.validation`), DTOs só de controller e o `WhisperService` original.
- **`BackConfig`** (`src/back/config/back-config.ts`): configuração tipada (pastas, URL do Ollama, chave do Gemini) no lugar do `AppConfig`/`EnvKeys`. O `SettingsBackConfig` a implementa sobre o Settings e os segredos.
- **`BackModule.forRoot({ config, whisper })`** e **`BackContainer`**: Nest só como contêiner de DI (`createApplicationContext`), sem servidor HTTP e sem porta.
- **`GeminiProvider`** recebe a chave pela `BackConfig` e responde `NOT_CONFIGURED` sem chave (absorveu o provider substituto e o patch de módulos).
- **`WhisperService`** virou porta abstrata; o `DesktopWhisperService` a implementa.
- **`BackServices`** simplificado: pega as instâncias direto do contêiner.
- **Removido:** `BackRuntime`, `NestHost`, `module-patch`, `gemini-provider-factory`, `whisper-provider`, `backend-ready`, `DesktopAppConfig`, importação do `.env` (`legacy-env-import`, `env-seed`), constantes de HTTP (`PORT`, `CORS_ORIGIN`, `API_PREFIX`, `HOMELAB_BACK_DIR`…), o script `build:back` e a liberação de `localhost:3000` na CSP.
- **Dependências do desktop:** `@nestjs/common`, `@nestjs/core`, `@nestjs/axios`, `axios`, `rxjs`, `reflect-metadata`, `@google/genai`, `uuidv7`, `yaml`. Fora ficaram `@nestjs/config`, `@nestjs/swagger` e `@nestjs/platform-express`. `tsconfig` ganhou `experimentalDecorators` e `emitDecoratorMetadata`.
- **ESLint:** `src/back` mantém as exceções que o back já tinha (`any`, parâmetros `_`) e os testes copiados dispensam as regras `no-unsafe-*` para mocks.

## Mudanças de comportamento (corrigem acidentes do back original)
- O `VideoModule` do back **repetia** `AIService`, `AiUsageService` e os providers; agora importa o `AIModule`. Efeito visível: o **Uso de IA passa a contar as chamadas feitas pelo resumo de vídeo** (antes elas iam para um contador que nenhuma tela lia).
- O método `AIService.usage()` (dados de exemplo fixos, que só o controller de `GET ai/usage` antigo chamava, sem uso real) e seu DTO foram removidos.
- Sem mais `.env`: o app novo **não importa** mais as pastas e a chave do `back/.env` na primeira execução em desenvolvimento. Quem já tem `settings.json` não é afetado.

## Testes
- Main: **75 suítes, 860 testes** (eram 49 e 374); lint e tipos limpos. Novos: `back-container` (sobe o Nest de verdade, confere os providers, a instância única do `AIService`/`AiUsageService` e que nenhum `listen` é chamado), `back-services`, `settings-back-config` e os casos "sem chave" do Gemini.
- Os testes de controller do back foram descartados junto com os controllers.

## Verificação no Electron real (CDP, dados isolados, Whisper e Gemini reais, `dist` apagado e recompilado do zero)
- health, modelos e thinking do Gemini, **chat**, criar artigo, reindexar, listar, **livro** (estrutura e leitura), **transcrição (Whisper) e resumo (Gemini)** em fila (um por vez), dicas refletidas na Entrada, temporários limpos, e **Uso = 2** (chat + resumo).
- **Nenhuma porta aberta pelo app** além da 9222 que o teste ligou para depuração; a 3000 não existe mais. Nenhuma requisição HTTP no navegador e nenhum erro de console.
- **Usuário novo** (`userData` vazio, sem `.env`): a janela de Configurações abre sozinha, os padrões ficam em Documentos/HomeLab, Gemini responde `NOT_CONFIGURED`, Ollama aparece `error`, biblioteca vazia e os 2 tipos de job listados.
- `back/` e `front/`: `git status` vazio nos dois.

## Não verificado ao vivo
`npm run dev` (Vite com HMR; o renderer ainda usa `../front` até a 09b), resumo com Ollama (desligado aqui) e os cliques nas telas (os canais foram chamados direto; as telas só foram abertas nas fases anteriores).

## O que testar
1. `npm start` e usar o app normalmente (a interface não mudou).
2. Home: HomeLab `ok`; Ollama `error` se estiver desligado.
3. Chat com o Gemini; Uso de IA mostra a chamada.
4. Biblioteca e Livros: criar, editar e ler.
5. Jobs: transcrição e resumo; depois do resumo, **Uso de IA deve contá-lo** (novo).
6. Usuário novo: abra o app com `HOMELAB_USER_DATA_DIR` apontando para uma pasta vazia: as Configurações abrem sozinhas, sem erro.
7. `netstat -ano` com o app aberto: nenhuma porta em escuta pelo Electron.
8. Aba Network do DevTools: nenhuma requisição a `localhost`.
