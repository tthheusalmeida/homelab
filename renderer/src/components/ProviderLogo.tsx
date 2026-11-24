import { profileOf } from '#lib/ai-providers';
import { cn } from '#lib/utils';

interface ProviderLogoProps {
  /** Id do serviço (`gemini`, `anthropic`...); um id sem imagem mostra a inicial do nome. */
  provider: string;
  /** Nome do serviço: vira a inicial quando não há imagem. */
  label: string;
  /** Ajusta o tamanho e a moldura (`size-4 border-0`...): o que vier aqui vence o padrão. */
  className?: string;
}

/**
 * Selo do serviço de IA (Gemini, Anthropic...) para reconhecer cada um de relance: a imagem da
 * marca, que vem do perfil do provider (`lib/ai-providers`), num quadrado discreto. É decorativo:
 * o nome do serviço sempre aparece ao lado.
 */
export function ProviderLogo({ provider, label, className }: ProviderLogoProps) {
  const logo = profileOf(provider)?.logo;

  return (
    <span
      aria-hidden
      data-provider-logo={provider}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold text-muted-foreground',
        !logo?.fullBleed && 'border bg-muted/40',
        className,
      )}
    >
      {logo ? (
        <img
          src={logo.src}
          alt=""
          draggable={false}
          // proporcional ao quadrado, para o logo acompanhar o tamanho que o chamador escolher
          className={logo.fullBleed ? 'size-full object-cover' : 'size-2/3 object-contain'}
        />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </span>
  );
}
