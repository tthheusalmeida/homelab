import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** O tooltip do app (`Tip`) aberto ao passar o mouse no elemento; devolve o elemento do tooltip. */
export async function showTooltip(target: HTMLElement): Promise<HTMLElement> {
  await userEvent.hover(target);

  return screen.findByText(/./, { selector: '[data-slot="tooltip-content"]' });
}

/** O texto do tooltip que o elemento mostra ao passar o mouse. */
export async function tooltipTextOf(target: HTMLElement): Promise<string> {
  const tooltip = await showTooltip(target);
  const text = tooltip.textContent ?? '';

  await userEvent.unhover(target);

  return text;
}
