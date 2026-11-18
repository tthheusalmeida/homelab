import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ReadingSidePanel } from './ReadingSidePanel';

const tab = () => screen.getByRole('button', { name: 'Mostrar painel lateral' });
const panel = () => screen.queryByRole('complementary', { name: 'Sumário da leitura' });

const setup = () => {
  render(
    <div>
      <p>texto fora do painel</p>

      <ReadingSidePanel>
        <p>itens do sumário</p>
      </ReadingSidePanel>
    </div>,
  );

  return userEvent.setup();
};

describe('ReadingSidePanel', () => {
  it('when idle, should show only the hexagonal tab and keep the panel hidden', () => {
    setup();

    expect(tab()).toHaveAttribute('aria-expanded', 'false');
    expect(tab().querySelector('svg')).toBeInTheDocument();
    expect(panel()).not.toBeInTheDocument();
    expect(screen.queryByText('itens do sumário')).not.toBeInTheDocument();
  });

  it('when the tab is placed, should leave the scrollbar free on the right edge', () => {
    setup();

    expect(tab()).toHaveClass('right-5');
    expect(tab()).toHaveAttribute('title', 'Clique para abrir o painel');
  });

  it('when only hovering the tab, should not open the panel (it opens by click)', async () => {
    const user = setup();

    await user.hover(tab());

    expect(panel()).not.toBeInTheDocument();
  });

  it('when the tab is clicked, should open the panel and keep it open', async () => {
    const user = setup();

    await user.click(tab());

    expect(panel()).toBeInTheDocument();
    expect(screen.getByText('itens do sumário')).toBeInTheDocument();
    expect(tab()).toHaveAttribute('aria-expanded', 'true');

    await user.unhover(tab());

    expect(panel()).toBeInTheDocument();
  });

  it('when the panel is open and the mouse leaves it, should keep it open', async () => {
    const user = setup();

    await user.click(tab());
    await user.hover(screen.getByText('texto fora do painel'));

    expect(panel()).toBeInTheDocument();
  });

  it('when the tab is clicked again, should close the panel', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(tab());

    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('when the tab is clicked while the panel is open, should close it', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(tab());

    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('when clicking outside the panel, should close it', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(screen.getByText('texto fora do painel'));

    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('when clicking inside the panel, should keep it open', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(screen.getByText('itens do sumário'));

    expect(panel()).toBeInTheDocument();
  });

  it('when the panel is open, should leave the scrollbar free too', async () => {
    const user = setup();

    await user.click(tab());

    expect(panel()).toHaveClass('right-3');
  });

  it('when closed after being open, should stop listening to outside clicks', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(tab());
    await user.click(screen.getByText('texto fora do painel'));

    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('when the panel opens, should enter with the entrance transition', async () => {
    const user = setup();

    await user.click(tab());

    expect(panel()).toHaveClass('animate-enter-right');
    expect(panel()).toHaveAttribute('data-state', 'open');
  });

  it('when the tab is clicked to close, should keep the panel on screen while it leaves with the exit transition', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(tab());

    expect(panel()).toBeInTheDocument();
    expect(panel()).toHaveClass('animate-exit-right', 'pointer-events-none');
    expect(panel()).not.toHaveClass('animate-enter-right');
    expect(panel()).toHaveAttribute('data-state', 'closing');
    expect(tab()).toHaveAttribute('aria-expanded', 'false');
  });

  it('when the animation event never comes, should still remove the panel after the exit time', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(tab());

    await waitFor(() => expect(panel()).not.toBeInTheDocument(), { timeout: 1000 });
  });

  it('when the tab is clicked while the panel is leaving, should open it again', async () => {
    const user = setup();

    await user.click(tab());
    await user.click(tab());
    await user.click(tab());

    expect(panel()).toHaveAttribute('data-state', 'open');
    expect(panel()).toHaveClass('animate-enter-right');
  });

  it('when rendered, should use the soft chrome colors, less emphasized than the text', async () => {
    const user = setup();

    await user.click(tab());

    expect(panel()).toHaveClass('reading-chrome');
  });

  it('when the panel is open, should move the tab to the panel edge so it never hides under it', async () => {
    const user = setup();

    expect(tab()).toHaveClass('right-5');

    await user.click(tab());

    expect(tab()).toHaveClass('right-[21.25rem]');
    expect(tab()).not.toHaveClass('right-5');
  });

  it('when idle, should place the tab at the top, right below the header, not in the middle', () => {
    setup();

    expect(tab()).toHaveClass('top-[4.5rem]');
    expect(tab().className).not.toContain('top-1/2');
    expect(tab().className).not.toContain('-translate-y-1/2');
  });

  it('when the panel is open, should not repeat a close button inside it (the tab already closes it)', async () => {
    const user = setup();

    await user.click(tab());

    expect(screen.queryByRole('button', { name: /Fechar painel/ })).not.toBeInTheDocument();
    expect(tab()).toHaveAttribute('title', 'Clique para fechar o painel');
  });

  it('when the panel is open, should rotate the tab arrow to indicate closing', async () => {
    const user = setup();

    expect(tab().querySelector('svg')).not.toHaveClass('rotate-180');

    await user.click(tab());

    expect(tab().querySelector('svg')).toHaveClass('rotate-180');
  });
});
