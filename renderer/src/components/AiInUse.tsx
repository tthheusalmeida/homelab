import { useState } from 'react';

import { ArrowLeftRight } from 'lucide-react';

import { useAiInUse, useSwitchSessionAi } from '#hooks/use-ai-in-use';
import { useErrorAlert } from '#hooks/use-error-alert';
import { AiInUseStrings, formatAiChoice } from '#lib/ai-in-use-text';
import { profileOf } from '#lib/ai-providers';
import type { AiPreference } from '#shared/contracts/ai';
import { Badge } from '#ui/badge';
import { Button } from '#ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#ui/dialog';

import { AiPicker, isAiPreferenceComplete } from './AiPicker';
import { ProviderLogo } from './ProviderLogo';

/**
 * Mostra qual IA está em uso na sugestão de título, no mapa mental e no infográfico (a padrão, a
 * automática ou a trocada nesta sessão) e deixa trocar na hora, só até fechar o app. Quando o
 * serviço está sobrecarregado, é aqui que se troca e se tenta de novo.
 */
export function AiInUse() {
  const { data } = useAiInUse();
  const switchSession = useSwitchSessionAi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiPreference | null>(null);
  useErrorAlert(switchSession.isError && AiInUseStrings.failed);

  if (!data) {
    return null;
  }

  const { effective, session } = data;
  const profile = profileOf(effective.providerId);
  const serviceName = profile?.name ?? effective.providerId;

  const openDialog = () => {
    setDraft({ providerId: effective.providerId, modelId: session?.modelId ?? null });
    setOpen(true);
  };

  const apply = (preference: AiPreference | null) =>
    switchSession.mutate(preference, { onSuccess: () => setOpen(false) });

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <ProviderLogo
        provider={effective.providerId}
        label={serviceName}
        className="size-5 rounded-md text-[10px]"
      />

      <span>
        <span className="sr-only">{AiInUseStrings.label}: </span>
        <span className="font-medium text-foreground">
          {formatAiChoice(serviceName, effective.modelId)}
        </span>
      </span>

      <Badge variant={effective.source === 'session' ? 'default' : 'outline'}>
        {AiInUseStrings.sources[effective.source]}
      </Badge>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs"
        aria-label={AiInUseStrings.switchLabel}
        onClick={openDialog}
      >
        <ArrowLeftRight />
        {AiInUseStrings.switchButton}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{AiInUseStrings.dialog.title}</DialogTitle>

            <DialogDescription>{AiInUseStrings.dialog.description}</DialogDescription>
          </DialogHeader>

          <AiPicker value={draft} onChange={setDraft} disabled={switchSession.isPending} />

          <p className="text-sm text-muted-foreground">{AiInUseStrings.scope}</p>

          <DialogFooter>
            {session && (
              <Button
                variant="outline"
                disabled={switchSession.isPending}
                onClick={() => apply(null)}
              >
                {AiInUseStrings.dialog.backToDefault}
              </Button>
            )}

            <Button
              variant="outline"
              disabled={switchSession.isPending}
              onClick={() => setOpen(false)}
            >
              {AiInUseStrings.dialog.cancel}
            </Button>

            <Button
              disabled={!draft || !isAiPreferenceComplete(draft) || switchSession.isPending}
              loading={switchSession.isPending}
              onClick={() => apply(draft)}
            >
              {AiInUseStrings.dialog.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
