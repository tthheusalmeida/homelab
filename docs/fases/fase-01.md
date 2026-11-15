# Fase 01 — Casca Electron com o front atual

Status: pendente

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

## Testes unitários
- Resolvedor da URL/arquivo do front por modo (dev/build).
- Opções da janela: garantir as flags de segurança.
- Bloqueio de navegação externa.

## O que testar
1. `npm run dev`: o app abre numa janela e mostra a Home.
2. Navegar por Biblioteca, Livros, Chat, Uso e Jobs: tudo funciona como no navegador.
3. Criar um job e acompanhar o progresso.
4. Fechar a janela: o processo do Nest termina (a porta 3000 fica livre).

## Critério de aceite
Comportamento idêntico ao do navegador; nenhuma mudança no front ou no back além do necessário para carregar.
