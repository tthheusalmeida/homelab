# Fase 10 — Empacotamento Windows

Status: pendente

## Objetivo
Instalador Windows que funciona numa máquina sem Node, sem repositório e sem `.env`.

## Escopo
- `electron-builder` com instalador NSIS (x64); configuração em arquivo versionado.
- `resources/bin/win32-x64` (Whisper e DLLs de CUDA) incluído via `extraResources`; o modelo **não** entra no instalador.
- Estrutura `resources/bin/<platform>-<arch>/` pronta para Linux e macOS (sem binários ainda), documentada em `resources/bin/README.md`.
- Ícone, nome, versão e `appId`.
- Script `npm run dist` e documentação do processo em `docs/`.
- Fora do escopo: assinatura de código, auto-update, builds de Linux e macOS.

## Testes unitários
- Resolvedor de binário em modo empacotado (`process.resourcesPath`) e em dev.
- Caminhos de `userData` e temporários no app empacotado.
- Suítes completas continuam passando.

## O que testar
1. `npm run dist` gera o instalador.
2. Instalar numa máquina limpa (sem Node, sem ffmpeg se quiser testar o aviso): o app abre sem erro e pede configuração.
3. Configurar chave, pastas e modelo; rodar um job de resumo completo.
4. Desinstalar e conferir o que fica em `userData`.
5. Aviso do SmartScreen é esperado (sem assinatura).

## Critério de aceite
Instalação, configuração e uso completos numa máquina limpa.
