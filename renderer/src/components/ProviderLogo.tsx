import anthropicLogo from '../assets/providers/anthropic.png';
import geminiLogo from '../assets/providers/gemini.png';

interface ProviderLogoProps {
  /** Id do serviço (`gemini`, `anthropic`...); um id sem imagem mostra a inicial do nome. */
  provider: string;
  /** Nome do serviço: vira a inicial quando não há imagem. */
  label: string;
  className?: string;
}

interface Logo {
  src: string;
  /** A imagem já traz o próprio fundo: ocupa o quadrado inteiro, sem moldura. */
  fullBleed?: boolean;
}

/** Imagens em `assets/providers` (origem e licença no README da pasta). */
const LOGOS: Record<string, Logo> = {
  gemini: { src: geminiLogo },
  anthropic: { src: anthropicLogo, fullBleed: true },
};

/**
 * Selo do serviço de IA (Gemini, Anthropic...) para reconhecer cada um de relance: a imagem da
 * marca num quadrado discreto. É decorativo: o nome do serviço sempre aparece ao lado.
 */
export function ProviderLogo({ provider, label, className = '' }: ProviderLogoProps) {
  const logo = LOGOS[provider];

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
