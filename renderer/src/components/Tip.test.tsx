import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tip } from './Tip';

const tooltip = (text: string) => screen.queryByText(text, { selector: '[data-slot="tooltip-content"]' });

describe('Tip', () => {
  it('when the mouse goes over the control, should show the text in the themed tooltip', async () => {
    render(
      <Tip content="Explicação">
        <button type="button">Ação</button>
      </Tip>,
    );

    expect(tooltip('Explicação')).toBeNull();

    await userEvent.hover(screen.getByRole('button', { name: 'Ação' }));

    expect(await screen.findByText('Explicação', { selector: '[data-slot="tooltip-content"]' })).toBeInTheDocument();
  });

  it('when the control is focused with the keyboard, should show the tooltip', async () => {
    render(
      <Tip content="Pelo teclado">
        <button type="button">Ação</button>
      </Tip>,
    );

    await userEvent.tab();

    expect(await screen.findByText('Pelo teclado', { selector: '[data-slot="tooltip-content"]' })).toBeInTheDocument();
  });

  it('when the mouse leaves, should hide the tooltip', async () => {
    render(
      <Tip content="Some">
        <button type="button">Ação</button>
      </Tip>,
    );

    await userEvent.hover(screen.getByRole('button'));
    await screen.findByText('Some', { selector: '[data-slot="tooltip-content"]' });
    await userEvent.unhover(screen.getByRole('button'));

    await waitFor(() => expect(tooltip('Some')).toBeNull());
  });

  it.each([undefined, null, false, ''])(
    'when the content is %j, should not show any tooltip nor add a title',
    async (content) => {
      render(
        <Tip content={content}>
          <button type="button">Ação</button>
        </Tip>,
      );

      const button = screen.getByRole('button');

      await userEvent.hover(button);

      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
      expect(button).not.toHaveAttribute('title');
    },
  );

  it('when the child has its own data-slot, should keep it', () => {
    render(
      <Tip content="x">
        <button type="button" data-slot="meu-botao">
          Ação
        </button>
      </Tip>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'meu-botao');
  });

  it('when the control is disabled and wrap is on, should explain it through the wrapper', async () => {
    render(
      <Tip content="Por que está desabilitado" wrap>
        <button type="button" disabled>
          Ação
        </button>
      </Tip>,
    );

    const wrapper = screen.getByRole('button').parentElement as HTMLElement;

    expect(wrapper).toHaveAttribute('tabindex', '0');

    await userEvent.hover(wrapper);

    expect(
      await screen.findByText('Por que está desabilitado', { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it('when wrap is on but there is no text, should not make the wrapper focusable', () => {
    render(
      <Tip content={false} wrap>
        <button type="button" disabled>
          Ação
        </button>
      </Tip>,
    );

    expect(screen.getByRole('button').parentElement).not.toHaveAttribute('tabindex');
  });
});
