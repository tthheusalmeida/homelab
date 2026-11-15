# Fase 03a — Núcleo de configuração e providers

Status: concluída

## Objetivo
Trocar o `.env` por configuração guardada pelo app, com providers externos e locais separados, **sem alterar `back/` nem `front/`**. A janela de Configurações é a fase 03b; aqui tudo é testável pelo console do DevTools.

## Escopo
- `SettingsStore` (`userData/settings.json`, escrita atômica, validação) e `SecretStore` (`userData/secrets.json`, cifrado com `safeStorage`; recusa gravar sem criptografia).
- `DesktopAppConfig`: implementa o `AppConfig` do back lendo do store.
- `NestHost`: sobe o Nest com os módulos do back, sem `ConfigModule`/`.env`, mantendo o HTTP que o front ainda usa.
- Fábrica do Gemini: sem chave o app abre e o provider responde `NOT_CONFIGURED`.
- Importação única do `.env` do back na primeira execução em desenvolvimento.
- Canais `settings:get|update`, `providers:external:list|get|save|test`, `providers:local:list|get|save|test`, `app:relaunch`.

## Decisões (registradas na entrega)
- **Nada em `back/` nem `front/` foi alterado.** O desktop carrega os módulos compilados do back (`back/dist`) e os pacotes a partir de `back/node_modules` (`BackRuntime`), para o Nest ser o mesmo.
- **`AppConfig`:** um módulo global do desktop provê o token `AppConfig` do back com o `DesktopAppConfig`.
- **`GeminiProvider`:** o back o declara em dois módulos (`AIModule` e `VideoModule`) e ele lança no construtor sem chave. O desktop troca esse provider nos metadados dos dois módulos antes de subir o Nest (`replaceModuleProvider`). Com chave, cria o provider real (a variável `GEMINI_API_KEY` existe só durante a criação). Sem chave, usa `MissingKeyGeminiProvider`.
- **Mudança de configuração exige reiniciar:** os services do back leem a configuração uma vez, ao serem criados. Toda gravação responde `restartRequired`; o canal `app:relaunch` reinicia (no modo dev apenas fecha, porque o Vite morre junto).
- **Padrões para abrir sem configuração:** pastas em `Documentos/HomeLab/{library,inbox,temp/video,temp/audio}`; Whisper em `resources/bin/<platform>-<arch>`; Ollama em `http://localhost:11434`. Por isso as pastas nunca geram `NOT_CONFIGURED`; só a chave do Gemini.
- **Whisper nesta fase** continua como hoje: pasta + executável + nome do modelo (o back junta pasta e nome). Caminho de modelo livre e binário por plataforma via resolvedor ficam na fase 08.
- **ffmpeg** só é testável: o back chama `ffmpeg` pelo PATH e não dá para configurar sem editá-lo. Entra como `editable: false`.
- **Chave nunca volta em claro:** as respostas trazem só `configured` e a chave mascarada (`••••••••` + 4 últimos).
- **Teste de conexão** aceita uma chave/config candidata antes de salvar. Falhas viram `{ ok: false, message }`, nunca exceção; a mensagem do Gemini é extraída do JSON da SDK.
- **Segredo ilegível** (ex.: outro usuário do Windows) conta como não configurado; `settings.json` corrompido vai para `.corrupt` e o app segue com os padrões.
- **Dados isolados em testes e dev:** `HOMELAB_USER_DATA_DIR` aponta o `userData` para outra pasta.

## Testes unitários
173 testes em 33 suítes (suíte completa). Desta fase: `JsonFile`, `SettingsStore`, validador, `SecretStore` e máscara, importação do `.env`, `DesktopAppConfig`, `SettingsService`, serviços de providers externos e locais, definições (Whisper, Ollama, ffmpeg, Gemini), handlers, `replaceModuleProvider`, fábrica do Gemini, `BackRuntime` e composição.

## Verificado nesta entrega
Execução real do Electron (build) com `userData` temporário e inspeção por CDP:
- Primeira execução: o `.env` do back foi importado (pastas, Whisper, Ollama) e a chave do Gemini foi gravada **cifrada** (sem `AIza` em claro nos arquivos).
- `providers:external:list` devolve `configured: true` com a chave mascarada; `providers:local:list` devolve Whisper, Ollama e ffmpeg.
- Testes: ffmpeg ok (versão), Whisper ok (executável e modelo encontrados), Ollama "não foi possível conectar" (não está rodando aqui), Gemini com chave inválida → mensagem legível.
- `settings:update` com pasta relativa → `VALIDATION` em português; pasta válida grava e responde `restartRequired: true`; provider desconhecido → `NOT_FOUND`.
- HTTP legado intacto: `health/system` 200, `ai/providers`, `library/inbox`, e com a chave real `health/ai` mostra Gemini `ok` e `ai/providers/gemini/models` responde 200.
- Sem chave: o app abre, `health/ai` mostra Gemini `error`, e o log traz o `NOT_CONFIGURED` em português. Pelo HTTP isso aparece como 500 genérico; pelo IPC (fase 04 em diante) chegará como `NOT_CONFIGURED`.
- **Não verificado por mim:** `app:relaunch` e o fluxo em janela (03b).

## O que testar
1. `npm run dev`. No console do DevTools: `await window.api.invoke('settings:get')` → suas pastas atuais (importadas do `.env` do back, se for a primeira execução).
2. `await window.api.invoke('providers:external:list')` → Gemini `configured: true` com `maskedKey` terminando nos 4 últimos caracteres da sua chave (e **nunca** a chave inteira).
3. `await window.api.invoke('providers:local:list')` → Whisper, Ollama e ffmpeg.
4. `await window.api.invoke('providers:local:test', { id: 'whisper' })` e o mesmo para `ffmpeg` e `ollama` → resultado coerente com a sua máquina (Ollama só dá ok se estiver rodando).
5. `await window.api.invoke('providers:external:test', { id: 'gemini' })` → `ok: true` com a sua chave salva (faz uma chamada de listagem de modelos ao Gemini).
6. `await window.api.invoke('settings:update', { libraryDir: 'relativo' })` → `ok: false`, `VALIDATION`.
7. Abra `%APPDATA%\homelab-desktop` e confira `settings.json` legível e `secrets.json` sem a sua chave em texto.
8. Use o app normalmente (Home, Biblioteca, Chat, Jobs): deve funcionar como antes, agora sem ler o `.env` do back.
9. Opcional: apague `settings.json` e `secrets.json` e abra de novo; ele reimporta do `.env`. Para testar sem chave, use `HOMELAB_USER_DATA_DIR` apontando para uma pasta com `settings.json` contendo `{}`.

## Critério de aceite
O app abre sem `.env` (no desktop o `.env` só é lido uma vez, na importação inicial), pastas e providers ficam configuráveis e persistentes pelos canais, segredos nunca chegam ao renderer em claro e o HTTP legado segue funcionando.
