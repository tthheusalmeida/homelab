import { profileOf } from '#lib/ai-providers';

interface ProviderLogoProps {
  /** Id do serviço (`gemini`, `anthropic`...); um id sem imagem mostra a inicial do nome. */
  provider: string;
  /** Nome do serviço: vira a inicial quando não há imagem. */
  label: string;
  className?: string;
}

/**
 * Selo do serviço de IA (Gemini, Anthropic...) para reconhecer cada um de relance: a imagem da
 * marca, que vem do perfil do provider (`lib/ai-providers`), num quadrado discreto. É decorativo:
 * o nome do serviço sempre aparece ao lado.
 */
export function ProviderLogo({ provider, label, className = '' }: ProviderLogoProps) {
  const logo = profileOf(provider)?.logo;

  return (
    <span
      aria-hidden
      data-provider-logo={provider}
      className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-semibold text-muted-foreground ${
        logo?.fullBleed ? '' : 'border bg-muted/40'
      } ${className}`}
    >
      {logo ? (
        <img
          src={logo.src}
          alt=""
          draggable={false}
          className={logo.fullBleed ? 'size-full object-cover' : 'size-6 object-contain'}
        />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </span>
  );
}
