import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SectionProvider, TextEditProvider, Txt } from './common';

describe('Txt — formulas', () => {
  it('when the text is a string with a formula, should draw it', () => {
    const { container } = render(<Txt kind="item.text">{'vale $x^2$ sempre'}</Txt>);

    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container).toHaveTextContent('vale');
  });

  it('when the text is plain, should render it unchanged', () => {
    render(<Txt kind="item.text">Texto simples</Txt>);

    expect(screen.getByText('Texto simples')).toBeInTheDocument();
  });

  it('when the text is not a string, should render the children as they are', () => {
    render(
      <Txt kind="title">
        <b>Negrito</b>
      </Txt>,
    );

    expect(screen.getByText('Negrito').tagName).toBe('B');
  });

  it('when editing is on, should draw the formula inside the editable button', () => {
    const { container } = render(
      <TextEditProvider value={vi.fn()}>
        <SectionProvider value={0}>
          <Txt kind="item.text" index={0}>
            {'dobro $2x$'}
          </Txt>
        </SectionProvider>
      </TextEditProvider>,
    );

    expect(container.querySelector('[data-slot="editable-text"] .katex')).not.toBeNull();
  });
});
