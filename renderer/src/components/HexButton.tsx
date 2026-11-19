import type { ComponentProps } from "react";

import { Button } from "#ui/button";
import { cn } from "#lib/utils";

/** Mesmo hexágono do `HexDot` e do logo (ponta para cima). */
export const HEX_CLIP = "[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]";

/** Chip com as duas pontas de um hexágono (o horário dos trechos da transcrição). */
export const HEX_CHIP_CLIP =
  "[clip-path:polygon(9px_0,calc(100%-9px)_0,100%_50%,calc(100%-9px)_100%,9px_100%,0_50%)]";

/**
 * Botão de ícone hexagonal (a forma da marca), no lugar do botão redondo. Use para a ação
 * principal de um campo, como enviar uma mensagem.
 */
export function HexButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      size="icon-lg"
      className={cn("h-11 w-10 rounded-none p-0 transition-transform", HEX_CLIP, className)}
      {...props}
    />
  );
}
