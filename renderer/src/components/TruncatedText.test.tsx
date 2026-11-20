import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TruncatedText } from './TruncatedText';

/** O jsdom não mede nada: simula a largura do texto e a do espaço onde ele está. */
function measure(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
});

describe('TruncatedText', () => {
  it('when rendered, should show the text with the truncate classes', () => {
    render(<TruncatedText className="text-sm">Tecnologia</TruncatedText>);

    expect(screen.getByText('Tecnologia')).toHaveClass('truncate', 'text-sm');
  });

  it('when the text is cut, should show the whole text in a tooltip on hover', async () => {
    measure(200, 100);
    render(<TruncatedText>Redes de computadores e sistemas distribuídos</TruncatedText>);

    await userEvent.hover(screen.getByText('Redes de computadores e sistemas distribuídos'));

    expect(
      await screen.findByText('Redes de computadores e sistemas distribuídos', {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toHaveTextContent('Redes de computadores e sistemas distribuídos');
  });

  it('when the text fits, should not show any tooltip', async () => {
    measure(80, 100);
    render(<TruncatedText>Curto</TruncatedText>);

    await userEvent.hover(screen.getByText('Curto'));
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeInTheDocument();
  });

  it('when the text is exactly the width of the space, should not show a tooltip', async () => {
    measure(100, 100);
    render(<TruncatedText>Cabe certinho</TruncatedText>);

    await userEvent.hover(screen.getByText('Cabe certinho'));
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(document.querySelector('[data-slot="tooltip-content"]')).not.toBeInTheDocument();
  });
});
