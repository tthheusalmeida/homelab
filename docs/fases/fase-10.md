# Fase 10 — Empacotamento Windows

Status: implementada, aguardando ok

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

## Como ficou
- `electron-builder.yml` (NSIS x64, `appId: homelab`, nome `HomeLab`, instalador por usuário com escolha de pasta), ícone escolhido (colmeia, opção 91) em `build/` e `npm run icons`. Detalhes em `docs/empacotamento.md`.
- `resolveResourcesDir` (`src/main/paths.ts`): empacotado usa `process.resourcesPath`. A `composition` recebe `resourcesDir` no lugar de `projectRoot`.
- As dependências do renderer viraram `devDependencies` (não entram no instalador).
- Whisper: `whisper-cli.exe` e as DLLs de `D:homelabaiwhisper` em `resources/bin/win32-x64` (sem os outros executáveis e sem o modelo).
- **Verificado:** `npm run dist` gerou `HomeLab-Setup-0.0.1.exe` (564 MB). Instalei em silêncio numa pasta temporária (cerca de 1 min, 1,5 GB instalados), abri o app instalado (E2E: Home, janela de Configurações do usuário novo, Whisper achado em `<instalação>esourcesinwin32-x64`) e removi o teste. Jest 854 testes, 75 suítes.
- **Não verificado:** máquina limpa de verdade (sem Node, sem ffmpeg), job de resumo completo no app instalado, desinstalação pelo `Uninstall HomeLab.exe` (meu teste de desinstalação falhou por aspas no comando; apaguei a pasta e limpei atalhos e registro à mão) e o aviso do SmartScreen.
