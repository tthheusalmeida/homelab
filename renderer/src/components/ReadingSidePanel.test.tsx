import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ReadingSidePanel } from './ReadingSidePanel';

const edge = (side: 'left' | 'right' = 'right') =>
  document.querySelector(`[data-slot="reading-edge-${side}"]`) as HTMLElement;
const panel = (name = 'Sumário da leitura') => screen.queryByRole('complementary', { name });

const setup = (props: Partial<React.ComponentProps<typeof ReadingSidePanel>> = {}) => {
  render(
    <div>
      <p>texto fora do painel</p>

      <ReadingSidePanel {...props}>
        <p>itens do sumário</p>
      </ReadingSidePanel>
    </div>,
  );

  return userEvent.setup();
};

describe('ReadingSidePanel', () => {
  it('when idle, should show no button and keep the items hidden', () => {
    setup();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(panel()).not.toBeInTheDocument();
    expect(screen.queryByText('itens do sumário')).not.toBeInTheDocument();
  });

  it('when idle, should keep an invisible hover strip that leaves the scrollbar free on the right', () => {
    setup();

    expect(edge()).toHaveClass('fixed', 'right-4');
    expect(edge()).toBeEmptyDOMElement();
  });

  it('when the mouse enters the strip, should show the items with the entrance transition', async () => {
    const user = setup();

    await user.hover(edge());

    expect(screen.getByText('itens do sumário')).toBeInTheDocument();
    expect(panel()).toHaveClass('animate-enter-right');
    expect(panel()).toHaveAttribute('data-state', 'open');
  });

  it('when shown, should have no panel background or border, only the cards inside', async () => {
    const user = setup();

    await user.hover(edge());

    expect(panel()).toHaveClass('!bg-transparent', 'border-0', 'reading-chrome');
  });

  it('when shown, should live inside the strip so moving the mouse onto the cards never closes and reopens it', async () => {
    const user = setup();

    await user.hover(edge());

    expect(edge()).toContainElement(panel());
  });

  it('when the mouse moves from the strip onto the items, should keep them open', async () => {
    const user = setup();

    await user.hover(edge());
    await user.unhover(edge());
    await user.hover(panel() as HTMLElement);
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(panel()).toHaveAttribute('data-state', 'open');
  });

  it('when the mouse leaves, should close with the exit transition and then remove the items', async () => {
    const user = setup();

    await user.hover(edge());
    await user.unhover(edge());

    await waitFor(() => expect(panel()).toHaveAttribute('data-state', 'closing'));
    expect(panel()).toHaveClass('animate-exit-right', 'pointer-events-none');
    await waitFor(() => expect(panel()).not.toBeInTheDocument(), { timeout: 1500 });
  });

  it('when the mouse comes back while the items are leaving, should open them again', async () => {
    const user = setup();

    await user.hover(edge());
    await user.unhover(edge());
    await waitFor(() => expect(panel()).toHaveAttribute('data-state', 'closing'));
    await act(async () => {
      await user.hover(edge());
    });

    expect(panel()).toHaveAttribute('data-state', 'open');
  });

  it('when side is left, should use the left strip, position and transitions, with the given name', async () => {
    const user = setup({ side: 'left', label: 'Acompanhamento da leitura' });

    expect(edge('left')).toHaveClass('left-0');
    expect(edge('right')).toBeNull();

    await user.hover(edge('left'));

    expect(panel('Acompanhamento da leitura')).toHaveClass('left-4', 'animate-enter-left', 'w-56');
  });
});

describe('ReadingSidePanel — width', () => {
  it('when a width is given, should use it instead of the default', async () => {
    const user = setup({ width: 'w-[19rem]' });

    await user.hover(edge());

    expect(panel()).toHaveClass('w-[19rem]');
    expect(panel()).not.toHaveClass('w-56');
  });
});

describe('ReadingSidePanel — portaled content', () => {
  it('when the mouse moves over content portaled into the panel, should not count as leaving', async () => {
    const user = userEvent.setup();
    let slot: HTMLElement | null = null;
    const { createPortal } = await import('react-dom');

    function Host() {
      const [target, setTarget] = useState<HTMLElement | null>(null);

      return (
        <>
          <ReadingSidePanel>
            <div ref={(node) => { slot = node; setTarget(node); }} />
          </ReadingSidePanel>
          {target && createPortal(<p>item do portal</p>, target)}
        </>
      );
    }

    render(<Host />);
    await user.hover(edge());
    await user.hover(screen.getByText('item do portal'));
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(slot).not.toBeNull();
    expect(panel()).toHaveAttribute('data-state', 'open');
  });
});
