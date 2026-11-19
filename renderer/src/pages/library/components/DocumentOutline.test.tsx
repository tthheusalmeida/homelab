import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { DocumentOutline } from './DocumentOutline';

const headings = [
  { id: 'a', text: 'Introdução', level: 1 },
  { id: 'b', text: 'Detalhes', level: 2 },
];

describe('DocumentOutline', () => {
  it('when there are two or more headings, should show the Sumário with them', () => {
    render(<DocumentOutline headings={headings} />);

    const nav = screen.getByRole('navigation', { name: 'Sumário' });

    expect(within(nav).getByText('Introdução')).toBeInTheDocument();
    expect(within(nav).getByText('Detalhes')).toBeInTheDocument();
  });

  it('when there are fewer than two headings, should render nothing', () => {
    const { container } = render(<DocumentOutline headings={headings.slice(0, 1)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('when a heading is the active one, should mark only it', () => {
    render(<DocumentOutline headings={headings} activeId="b" />);

    expect(screen.getByText('Detalhes').closest('[aria-current]')).not.toBeNull();
    expect(screen.getByText('Introdução').closest('[aria-current]')).toBeNull();
  });
});
