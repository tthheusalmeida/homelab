# Como adicionar um provider de IA na nuvem

Um provider novo (ex.: OpenAI) entra **estendendo** o que já existe, sem copiar o Gemini ou a Anthropic. O compilador e os testes avisam se algum passo ficar para trás.

## Os cinco passos

1. **Id** — `src/shared/contracts/providers.ts`: acrescente o id em `EXTERNAL_PROVIDER_IDS`. Daí saem sozinhos `ExternalProviderId`, `AiProviderId`, `SecretKey` (`<id>.apiKey`) e o tipo de `ApiKeys`.
2. **Provider no back** — pasta `src/back/modules/ai/providers/<id>/` com só o que é da SDK dele:
   - `<id>.pricing.ts`: tabela de preços e `ModelCatalog` (`ModelCatalog.flat(...)`, ou `new ModelCatalog(...)` com faixas de prompt e um normalizador de ID).
   - `<id>-errors.ts`: mensagens em português e `classify<Id>Error`, que trata o que é só do provider (resposta vazia, recusa, motivo no corpo do erro) e entrega o resto a `classifyByStatus`.
   - `<id>.provider.ts`: classe que implementa `AIProvider` e `ChatBackend`. Só escreve `attempt` (uma chamada à SDK), `health`, `models` e `thinking`; `chat` é `runResilientChat(this, usage, request)`, que já traz tentativas, troca para o modelo mais barato e registro de consumo. A chave vem de `config.apiKeyFor('<id>')`.
   - Registre a classe em `PROVIDER_CLASSES`, em `ai.module.ts` (uma linha).
3. **Definição da chave** — `src/providers/<id>.definition.ts` com `createApiKeyDefinition({...})` (mensagens de sucesso e falha, e o teste padrão com a SDK); acrescente uma linha em `FACTORIES`, em `external-definitions.ts`.
4. **Perfil na interface** — `renderer/src/lib/ai-providers/<id>.ts` com nome, empresa, descrição, logo, `sentTo` (para onde o texto vai, com a preposição), links de consumo e o passo a passo da chave; acrescente uma linha em `AI_PROVIDER_PROFILES`, em `renderer/src/lib/ai-providers.ts`. O PNG do logo vai em `renderer/src/assets/providers/` (origem e licença no README da pasta).
5. **SDK** — `npm install <sdk>` (entra em `dependencies`, para ir no instalador).

Configurações (cartão, logo, guia), Consumo (botão e links), o aviso do PDF e a lista de modelos passam a conhecer o provider sem mais nenhuma edição.

## O que impede de esquecer um passo
- `FACTORIES` e `AI_PROVIDER_PROFILES` são `Record` por id: faltar entrada **não compila**.
- `back-container.spec.ts` exige um provider registrado para cada id de `AI_PROVIDER_IDS`.
- `ai-providers.test.ts` (renderer) exige guia, links, logo e destino em todo perfil externo.
- `external-definitions.spec.ts` confere o segredo `<id>.apiKey` de cada definição.

## O que escrever de teste
Cada arquivo novo tem o seu `.spec.ts`/`.test.ts`: catálogo, classificador de erros, provider (SDK mockada: sem chave, chat, erros, troca de modelo, lista de modelos) e definição. O fluxo comum já é testado em `shared/resilient-chat.spec.ts`; não o repita, teste só o que é do provider.

## Peças comuns (onde olhar antes de copiar qualquer coisa)
| Peça | Arquivo | Faz |
|---|---|---|
| `ModelCatalog` | `providers/shared/model-catalog.ts` | modelos cadastrados, preço por faixa, custo, ordem por custo, mais barato |
| `classifyByStatus` | `providers/shared/status-error-classifier.ts` | erro HTTP em passageiro ou não |
| `runResilientChat` | `providers/shared/resilient-chat.ts` | confere a chave, repete, troca de modelo, registra consumo |
| `createApiKeyDefinition` | `src/providers/api-key-definition.ts` | definição de provider que só precisa de chave |
| `readApiKeys` | `src/settings/api-keys.ts` | lê a chave de todos os providers externos |
| perfil | `renderer/src/lib/ai-providers/` | o que a interface sabe de cada provider |
