import { Fragment, useState } from "react";

import { useAiUsage } from "./hooks/useAiUsage";
import type { AIProviderName } from "./types/ai.types";

import { Button } from "../../../ui/button";

import { UsageSummary } from "./components/UsageSummary";
import { UsageTimeline } from "./components/UsageTimeline";
import { ProviderUsage } from "./components/ProviderUsage";
import { ModelUsage } from "./components/ModelUsage";
import { RecentRequests } from "./components/RecentRequests";
import { ExternalLink } from "#components/ExternalLink";
import { AI_PROVIDER_LIST, AI_PROVIDERS_WITH_CONSOLE } from "#lib/ai-providers";
import { PageHeader } from "#components/PageHeader";
import { PageLoading, PageError } from "#components/PageState";
import { Card, CardContent } from "../../../ui/card";

export function UsagePage() {
  const [provider, setProvider] = useState<AIProviderName>();

  const { data, isLoading, isError } = useAiUsage({
    provider,
  });

  if (isLoading) {
    return (
      <PageLoading />
    );
  }

  if (isError || !data) {
    return (
      <PageError
        primaryMessage="Oops! houve falha ao carregar o uso de IA"
        secondaryMessage="Tente novamente mais tarde."
      />
    );
  }

  return (
    <div className="animate-enter-fade space-y-6">
      <PageHeader
        title="Consumo"
        command="ai --usage"
        description="Monitora o consumo de AI, custo e performance."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={!provider ? "secondary" : "outline"}
              size="sm"
              onClick={() => setProvider(undefined)}
            >
              Todos
            </Button>

            {AI_PROVIDER_LIST.map((profile) => (
              <Button
                key={profile.id}
                variant={provider === profile.id ? "secondary" : "outline"}
                size="sm"
                onClick={() => setProvider(profile.id)}
              >
                {profile.name}
              </Button>
            ))}
          </div>
        }
      />

      {/* De onde vêm os números e onde ver o gasto real da conta */}
      <Card className="animate-enter">
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Consumo registrado pelo HomeLab</span>, neste computador:
            tokens e custo estimado de cada resposta, guardados em disco (não se perdem ao fechar o
            app).
          </p>

          <p className="text-muted-foreground">
            Isto não é a fatura. Os serviços de IA na nuvem não informam gasto nem cota restante pela
            chave de API; para o valor real da conta, consulte o painel do provedor:
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {AI_PROVIDERS_WITH_CONSOLE.map(({ id, console: links }) => (
              <Fragment key={id}>
                <ExternalLink href={links!.usageUrl}>{links!.usageLabel}</ExternalLink>

                <ExternalLink href={links!.billingUrl}>{links!.billingLabel}</ExternalLink>
              </Fragment>
            ))}
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
