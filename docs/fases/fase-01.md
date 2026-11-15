# Fase 01 — Casca Electron com o front atual

Status: concluída

## Objetivo
App Electron abrindo o front atual, com o Nest rodando junto por HTTP, exatamente como hoje. Sem IPC ainda.

## Escopo
- `package.json`, TypeScript (main em CJS), Electron na versão estável registrada na fase 00, scripts `dev`, `build`, `test`, `lint`.
- `src/main` (bootstrap e janela) e `src/preload` mínimo. Janela com `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Carregar o front: em dev, `http://localhost:5173`; em build, os arquivos estáticos do front.
- Subir os módulos do Nest do `back` dentro do main (HTTP na porta atual, `.env` do back ainda em uso).
- Ajustar CORS/origem se o front empacotado exigir (decidir e registrar aqui: protocolo customizado ou origem do app).
- Fechar a janela encerra o Nest.
- Jest configurado para o desktop; documentar os comandos em `CLAUDE.md` e `testing.md`.

## Decisões (registradas na entrega)
- **Nada em `back/` nem `front/` foi alterado.** O main só lê o `back/dist` e o `front/dist` gerados pelos scripts deles.
- **Back no main:** `BackendLauncher` ajusta `CORS_ORIGIN`, faz `chdir` para a pasta do back (de onde o `.env` é lido) e carrega `back/dist/main.js` com `createRequire`. Como o Nest roda no mesmo processo, fechar a app libera a porta.
- **Front empacotado:** protocolo privilegiado `app://front` (`protocol.handle`) serve `front/dist`; rotas do React Router (caminho sem extensão) caem no `index.html`; fora da pasta do build → 404.
- **CORS:** o main define `CORS_ORIGIN` antes de carregar o back (`app://front` no build, `http://localhost:5173` no dev). O valor do `.env` do back é sobrescrito apenas no processo.
- **Pronto para abrir:** a janela só abre depois que `GET /api/v1/health/system` responde (60 tentativas de 500 ms).
- **Instância única** (`requestSingleInstanceLock`), para não dar `EADDRINUSE` ao abrir o app duas vezes.
- **Variáveis opcionais do main:** `HOMELAB_FRONT_URL` (modo dev), `HOMELAB_FRONT_DIST_DIR`, `HOMELAB_BACK_DIR`, `PORT` (padrão 3000).
- Electron **45.3.2**. Main compilado em CJS com `tsc`; imports relativos.

## Testes unitários
- Resolvedor da URL/arquivo do front por modo (dev/build).
- Opções da janela: garantir as flags de segurança.
- Bloqueio de navegação externa.

## Verificado nesta entrega
- `npm test`: 7 suítes, 26 testes passando; `npm run lint` e `npm run build:main` sem erros.
- Execução real do Electron em modo build: o Nest subiu dentro do main, `/api/v1/health/system` respondeu 200 com `Access-Control-Allow-Origin: app://front`, e ao encerrar o processo a porta 3000 ficou livre.
- **Não verificado por mim:** o aspecto visual da janela, o carregamento do front via `app://front` e o modo `dev` com o Vite. Dependem do checklist abaixo.

## O que testar
1. `npm run dev`: o app abre numa janela e mostra a Home.
2. Navegar por Biblioteca, Livros, Chat, Uso e Jobs: tudo funciona como no navegador.
3. Criar um job e acompanhar o progresso.
4. Fechar a janela: o processo do Nest termina (a porta 3000 fica livre).

## Critério de aceite
Comportamento idêntico ao do navegador; nenhuma mudança no front ou no back além do necessário para carregar.
