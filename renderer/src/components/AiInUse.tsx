import { useState } from 'react';

import { ArrowLeftRight } from 'lucide-react';

import { useAiInUse, useSwitchSessionAi } from '#hooks/use-ai-in-use';
import { useErrorAlert } from '#hooks/use-error-alert';
import { usePersistedFlag } from '#hooks/use-persisted-flag';
import { AiInUseStrings, formatAiChoice } from '#lib/ai-in-use-text';
import { profileOf } from '#lib/ai-providers';
import { cn } from '#lib/utils';
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
import { IconButton } from './IconButton';
import { ProviderLogo } from './ProviderLogo';

/** Lembra se o chip flutuante está aberto (começa fechado, só o ícone, para não cobrir o conteúdo). */
export const AI_IN_USE_EXPANDED_KEY = 'homelab.ai-in-use-expanded';

interface AiInUseProps {
  /**
   * Chip que flutua sobre o conteúdo: começa fechado, só o ícone (do tamanho dos outros ícones do
   * app), e clicar nele abre e fecha; a escolha fica lembrada. Sem isto, é sempre o chip inteiro,
   * na linha.
   */
  collapsible?: boolean;
}

/**
 * Mostra qual IA está em uso na sugestão de título, no mapa mental e no infográfico (a padrão, a
 * automática ou a trocada nesta sessão) e deixa trocar na hora, só até fechar o app. Quando o
 * serviço está sobrecarregado, é aqui que se troca e se tenta de novo.
 */
export function AiInUse({ collapsible = false }: AiInUseProps) {
  const { data } = useAiInUse();
  const [expanded, setExpanded] = usePersistedFlag(AI_IN_USE_EXPANDED_KEY, false);
  const switchSession = useSwitchSessionAi();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AiPreference | null>(null);
  useErrorAlert(switchSession.isError && AiInUseStrings.failed);

  if (!data) {
    return null;
  }

  const { effective, session } = data;
  const serviceName = profileOf(effective.providerId)?.name ?? effective.providerId;
  const choice = formatAiChoice(serviceName, effective.modelId);

  const openDialog = () => {
    setDraft({ providerId: effective.providerId, modelId: session?.modelId ?? null });
    setOpen(true);
  };

  const apply = (preference: AiPreference | null) =>
    switchSession.mutate(preference, { onSuccess: () => setOpen(false) });

  const details = (
    <>
      <span>
        <span className="sr-only">{AiInUseStrings.label}: </span>
        <span className="font-medium text-foreground">{choice}</span>
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
    </>
  );

  const dialog = (
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
  );

  // Inline (sugestão de título): o chip inteiro, na linha, sem abrir nem fechar.
  if (!collapsible) {
    return (
      <>
        <div className="flex animate-enter-fade flex-wrap items-center gap-2 p-2 text-xs text-muted-foreground">
          <ProviderLogo
            provider={effective.providerId}
            label={serviceName}
            className="size-5 rounded-md text-[10px]"
          />

          {details}
        </div>

        {dialog}
      </>
    );
  }

  // Flutuante: uma pílula de altura fixa. O ícone é o botão (o mesmo `IconButton` dos controles do
  // mapa e do infográfico) e o conteúdo abre para a direita, dentro da mesma pílula; clicar no ícone
  // fecha. A altura não muda (32px, a do seletor ao lado, para a linha e o conteúdo não pularem): só a largura.
  return (
    <>
      <div className="flex h-8 w-fit animate-enter-fade items-center rounded-lg border bg-card text-xs text-muted-foreground shadow-sm">
        <IconButton
          label={expanded ? AiInUseStrings.hide : `${AiInUseStrings.show}: ${choice}`}
          aria-expanded={expanded}
          tooltipSide="bottom"
          variant="ghost"
          // 30px + a borda de 1px de cada lado = 32px: a altura dos botões `sm` do seletor ao lado
          className="size-[1.875rem]"
          onClick={() => setExpanded(!expanded)}
        >
          <ProviderLogo
            provider={effective.providerId}
            label={serviceName}
            className="size-4 rounded-sm border-0 bg-transparent text-[10px]"
          />
        </IconButton>

        <div
          // 0fr -> 1fr anima a largura sem mexer na altura; fechado, o conteúdo sai do teclado e do leitor de tela.
          className={cn(
            'grid transition-[grid-template-columns] duration-200 ease-out',
            expanded ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
          )}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-2 pr-2 pl-1 whitespace-nowrap">{details}</div>
          </div>
        </div>
      </div>

      {dialog}
    </>
  );
}
