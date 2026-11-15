# Fase 03 — Settings, providers e tela de Configurações

Status: pendente

## Objetivo
Substituir o `.env` por configuração pela interface, com providers externos e locais separados. Ver `configuracoes.md`.

## Escopo
- `SettingsStore` (`userData/settings.json`) e `SecretStore` (`safeStorage`).
- `AppConfig` lendo do store; importação única do `.env` no desenvolvimento.
- `GeminiProvider` com inicialização tardia; erro `NOT_CONFIGURED` quando faltar configuração.
- Handlers: `SettingsHandler` (`settings:get|update`), `ExternalProvidersHandler` (`providers:external:list|get|save|test`), `LocalProvidersHandler` (`providers:local:list|get|save|test`).
- Front: página de Configurações (pastas, providers externos, providers locais, botão "Testar") usando os componentes base existentes; redirecionar para ela quando um erro `NOT_CONFIGURED` ocorrer.
- Atualizar `back/doc/env.md` indicando o novo lugar de cada variável.

## Testes unitários
- `SettingsStore`: lê, grava, valida, arquivo ausente ou corrompido.
- `SecretStore`: cifra/decifra; chave nunca volta em claro nos retornos.
- `AppConfig` sobre o store; chave obrigatória ausente → `NOT_CONFIGURED`.
- Handlers: payload inválido → `VALIDATION`; teste de conexão ok e com falha.
- Front: formulário de Configurações (salvar, testar, erro) e redirecionamento.

## O que testar
1. Abrir Configurações; informar a chave do Gemini e salvar; reabrir o app: aparece "configurada" e a chave mascarada.
2. Informar pastas (biblioteca, entrada) e salvar; reabrir: persistem.
3. "Testar" no Gemini, Ollama, Whisper (modelo) e ffmpeg: resultado correto para o ambiente real e mensagem clara em caso de falha.
4. Apagar o `settings.json` (ou usar um `userData` limpo): o app abre sem erro e pede configuração.

## Critério de aceite
App abre sem `.env` e sem configuração; tudo configurável e persistente pela tela; segredos nunca expostos ao renderer.
