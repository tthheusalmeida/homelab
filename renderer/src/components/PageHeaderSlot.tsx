import { createContext } from "react";

/**
 * Lugar fixo do cabeçalho da tela, no `AppLayout`, entre a barra do topo e a área que rola. O
 * `PageHeader` se desenha aqui (por portal), então fica fora da rolagem: só o conteúdo rola.
 * `null` fora do layout (testes e telas isoladas): o cabeçalho aparece no lugar de origem.
 */
export const PageHeaderSlotContext = createContext<HTMLElement | null>(null);
