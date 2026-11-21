import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';

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
  // O tooltip sai com uma animação: espera sumir para o próximo não ler o texto do anterior.
  await waitFor(() =>
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull(),
  );

  return text;
}
