# IA padrão e troca temporária

A sugestão de título, o mapa mental e o infográfico usam a mesma IA, que o usuário escolhe **uma vez** (a IA padrão) e pode **trocar na hora, só até fechar o app**, quando o serviço está sobrecarregado. A tela sempre diz qual IA está em uso.

## Camadas (da mais forte à mais fraca)
1. **O que o chamador pediu** (ex.: um modelo informado no pedido): sobrepõe as demais; sem serviço, vale o da camada seguinte.
2. **Troca desta sessão:** só em memória no main (`DefaultAiService.session`). Some ao fechar o app; na próxima abertura volta o padrão.
3. **IA padrão** salva em `settings.json` (`ai.default`: `{ providerId, modelId | null }`); `modelId` nulo = o modelo mais barato do serviço.
4. **Automática** (sem nada salvo): o modelo mais barato do **primeiro serviço externo com chave** (na ordem de `EXTERNAL_PROVIDER_IDS`); sem nenhuma chave, o primeiro da lista, para o erro explicar a chave que falta.

Serviço local (Ollama) não tem catálogo de preços, então exige um modelo escolhido (`DefaultAiMessages.noModel`).

## Onde fica o código
| Peça | Arquivo | Faz |
|---|---|---|
| `DefaultAiService` | `src/back/modules/ai/default-ai.service.ts` | `resolve()` (a IA que vale agora), `state()`, `setSession()` |
| `AIProvider.cheapestModel?()` | `ai.model.ts` e cada provider | o modelo mais barato do catálogo (`ModelCatalog.cheapest()`); o Ollama não tem |
| Padrão salvo | `settings.json` (`ai.default`), `SettingsService.updateAiDefault` | vale na hora, sem reiniciar (`BackConfig.defaultAi()` lê a cada uso) |
| Canais | `ai:selection`, `ai:session`, `ai:default-update` | ver `ipc-canais.md` |
| Perfil de cada serviço | `renderer/src/lib/ai-providers/` | nome, empresa, logo (ver `adicionar-provider.md`) |
| `AiPicker` | `renderer/src/components/AiPicker.tsx` | serviço e modelo; "Mais barato (automático)" nos serviços na nuvem |
| `AiInUse` | `renderer/src/components/AiInUse.tsx` | chip "Anthropic · modelo" + etiqueta (Padrão, Automática ou Só nesta sessão) + **Trocar** |
| `DefaultAiSection` | `renderer/settings/src/sections/DefaultAiSection.tsx` | Configurações > IA > **IA padrão** |

## Na interface
- **Configurações > IA padrão:** escolhe o serviço e o modelo (ou "Automática") e salva. Mostra a IA em uso agora e de onde ela vem.
- **Chip "IA em uso"** na sugestão de título (Biblioteca), no mapa mental (canto superior esquerdo) e no infográfico (cabeçalho). **Trocar** abre um diálogo: escolhe outro serviço e modelo, **Usar nesta sessão**; **Voltar ao padrão** aparece quando há troca. O texto avisa que vale só até fechar o app.
- A troca vale para as três tarefas ao mesmo tempo e não mexe no que está salvo em Configurações.
- Falha de uma geração continua aparecendo no alerta do rodapé com **Tentar de novo**: depois de trocar a IA, basta tentar de novo.

## Resultado e consumo
Cada resultado guarda o **modelo** que o gerou (como antes). O consumo aparece na tela **Consumo**, no serviço que respondeu; se o serviço trocou sozinho para o modelo mais barato (ver `configuracoes.md`), o registro traz o modelo que respondeu de verdade.
