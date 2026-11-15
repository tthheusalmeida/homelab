import { useState } from "react";

import { useAiUsage } from "./hooks/useAiUsage";
import type { AIProviderName } from "./types/ai.types";

import { Button } from "../../../ui/button";
import { Card, CardContent } from "../../../ui/card";

import { UsageSummary } from "./components/UsageSummary";
import { UsageTimeline } from "./components/UsageTimeline";
import { ProviderUsage } from "./components/ProviderUsage";
import { ModelUsage } from "./components/ModelUsage";
import { RecentRequests } from "./components/RecentRequests";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { ExternalLink } from "#components/ExternalLink";
import { PROVIDER_CONSOLES } from "#lib/provider-consoles";

export function UsagePage() {
  const [provider, setProvider] = useState<AIProviderName>();

  const { data, isLoading, isError } = useAiUsage({
    provider,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center">
        <LoadingState message="Carregando" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ErrorState
            primaryMessage="Oops! houve falha ao carregar o uso de IA"
            secondaryMessage="Tente novamente mais tarde."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-enter-fade space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consumo de IA</h1>

          <p className="text-sm text-muted-foreground">
            Monitora o consumo de AI, custo e performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={!provider ? "secondary" : "outline"}
            size="sm"
            onClick={() => setProvider(undefined)}
          >
            Todos
          </Button>

          <Button
            variant={provider === "ollama" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setProvider("ollama")}
          >
            Ollama
          </Button>

          <Button
            variant={provider === "gemini" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setProvider("gemini")}
          >
            Gemini
          </Button>
        </div>
      </div>

      {/* De onde vêm os números e onde ver o gasto real da conta */}
      <Card className="animate-enter">
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Consumo registrado pelo HomeLab</span>, neste computador:
            tokens e custo estimado de cada resposta, guardados em disco (não se perdem ao fechar o
            app).
          </p>

          <p className="text-muted-foreground">
            Isto não é a fatura. O Gemini não informa gasto nem cota restante pela chave de API;
            para o valor real da conta, consulte o painel do provedor:
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <ExternalLink href={PROVIDER_CONSOLES.gemini.usageUrl}>
              Consumo no Google AI Studio
            </ExternalLink>

            <ExternalLink href={PROVIDER_CONSOLES.gemini.billingUrl}>
              Faturamento no Google Cloud
            </ExternalLink>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <UsageSummary data={data.summary} />

      {/* Timeline */}
      <UsageTimeline data={data.timeline} />

      {/* Providers + Models */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProviderUsage data={data.byProvider} />

        <ModelUsage data={data.byModel} />
      </div>

      {/* Requests */}
      <RecentRequests data={data.recentRequests} />
    </div>
  );
}
