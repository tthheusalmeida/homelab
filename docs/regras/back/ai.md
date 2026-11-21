# IA (modules/ai)

## Providers
- Existem dois providers: `ollama` (label "Ollama") e `gemini` (label "Gemini"), registrados no `AIService`.
- Pedir um provider desconhecido gera erro "Provider de IA não suportado".
- A lista de providers sempre sai na ordem ollama, gemini.

## Modelos
- Com provider informado, cada modelo ganha `id` (igual ao nome) e `label` (cada palavra separada por hífen vira capitalizada, hífen vira espaço; ex.: `gemini-3.5-flash` → "Gemini 3.5 Flash").
- Sem provider, devolve a junção dos modelos de todos os providers, sem `id`/`label`.
- Ollama: usa a URL de `OLLAMA_URL`. Lista via `GET /api/tags`, ordena por nome; qualquer item fora do formato esperado derruba a listagem inteira com erro.
- Gemini: só aparecem modelos que têm preço em `gemini.pricing.ts`; o prefixo `models/` é removido; ordenado por nome.
- Para um modelo aparecer no Gemini ele precisa ser cadastrado em `gemini.pricing.ts`.
- `cheapestModel()` devolve o modelo cadastrado com menor entrada + saída por milhão de tokens (hoje usado pela sugestão de classificação da biblioteca).

## Thinking
- Se o modelo suporta raciocínio, as opções são sempre `off` ("Desativado") e `on` ("Ativado"); senão, lista vazia.
- Ollama: suporta se `capabilities` do `/api/show` inclui `thinking`; resposta sem `capabilities` conta como sem suporte.
- Gemini: suporta se o modelo tem `thinking`.
- Erro na consulta gera mensagem com o nome do modelo.
- No chat do Ollama, `think` é `true` somente quando `thinking === 'on'`. No Gemini o parâmetro é ignorado.

## Chat
- O `AIService.chat` converte o DTO (`message`, `modelId`, `providerId`, `thinking?`) em request do provider.
- Gemini: sem texto na resposta é falha. **O motivo aparece para o usuário** (`gemini-errors.ts`, `classifyGeminiError`), em português: limite de uso atingido (429), serviço sobrecarregado ou fora do ar (5xx), sem conexão, resposta vazia, chave recusada (401/403), modelo indisponível (404), pedido recusado (400). Erro desconhecido mantém "A requisição para o chat do Gemini falhou." O erro original fica em `cause` (e o `video.service` o escreve no console).
- **Tentativas automáticas (Gemini):** erro passageiro (429, 5xx, rede, resposta vazia) repete sozinho, **até 3 tentativas** no total, com espera de 3 s e 8 s (`withRetry` em `utils/retry.ts`). Erro definitivo (401, 403, 404, 400, desconhecido) não repete. Antes de cada nova tentativa o provider chama `request.onRetry({ attempt, maxAttempts, delayMs, reason })`. Só a falha final registra **uma** falha de uso; tentativas intermediárias não registram nada.
- Ollama: resposta sem `message.content` string é inválida e vira falha de chat. Falha de conexão, modelo não instalado, falta de memória e demora têm mensagem própria (`ollama-errors.ts`); o resto mantém "A requisição para o chat do Ollama falhou." Ollama local não tem tentativa automática.
- Falhas registram uso com tokens e custo zerados e `success: false`.

## Custo
- Custo = `tokensEntrada/1.000.000 × preçoEntrada + tokensSaída/1.000.000 × preçoSaída`.
- Modelo sem preço cadastrado custa 0. Ollama é sempre 0.
- Tokens ausentes na resposta contam como 0. Total = total informado, ou entrada + saída.

## Usage (`AiUsageService`)
- Guarda no máximo 5000 registros (`MAX_USAGE_RECORDS`); o mais recente fica primeiro e o mais antigo é descartado. **Desde a identidade/consumo:** os registros também vão para `ai-usage.json` na pasta de dados do app (`BackConfig.usageFile`) e são relidos ao abrir, então o consumo sobrevive a reinícios. É o consumo **registrado pelo HomeLab neste computador**; o provedor (Gemini) não tem endpoint de gasto ou cota restante por chave de API, então o gasto real da conta só existe no painel dele (AI Studio / Google Cloud Billing).
- Cada registro recebe `id` (UUID) e `createdAt` (ISO).
- `getUsage(provider?)` filtra **todas** as seções pelo provider quando informado.
- Seções: `summary` (somas e latência média arredondada), `timeline` (por dia UTC, crescente), `byProvider`, `byModel` (chave provider+modelo) e `recentRequests` (as **10** mais recentes, `RECENT_REQUESTS_LIMIT`, com as que falharam).
- **Falhas entram no consumo:** toda falha de provedor (inclusive "sem chave configurada") é gravada por `recordFailure` com `success: false`, zero tokens e custo, e o motivo em `error`. Assim a tela de Consumo mostra o que deu errado sem ninguém precisar procurar.
- Sem registros: tudo zerado e listas vazias.
- `AIService.usage(query)` devolve dados **fictícios** (mock) e não é usado pelo controller; o endpoint real é `GET ai/usage`.

## Endpoints
- `GET ai/providers`, `GET ai/providers/:providerId/models`, `GET ai/thinking?providerId&modelId`, `GET ai/usage?provider`.
