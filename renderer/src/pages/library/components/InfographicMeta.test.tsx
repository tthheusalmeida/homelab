import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const saved: { state: { data: unknown } } = { state: { data: null } };
const calls: string[] = [];

vi.mock('../hooks/useLibrary', () => ({
  useInfographic: (id: string) => {
    calls.push(id);

    return saved.state;
  },
}));

import { InfographicMeta } from './InfographicMeta';

const sections = (count: number) => Array.from({ length: count }, (_, index) => ({ id: index }));

describe('InfographicMeta', () => {
  beforeEach(() => {
    saved.state = { data: null };
    calls.length = 0;
  });

  it('when there is no infographic yet, should show nothing', () => {
    const { container } = render(<InfographicMeta documentId="d1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('when there are several sections, should say how many', () => {
    saved.state = { data: { sections: sections(2), edited: false } };

    render(<InfographicMeta documentId="d1" />);

    expect(screen.getByText('2 seções')).toBeInTheDocument();
  });

  it('when there is a single section, should say "1 seção"', () => {
    saved.state = { data: { sections: sections(1), edited: false } };

    render(<InfographicMeta documentId="d1" />);

    expect(screen.getByText('1 seção')).toBeInTheDocument();
  });

  it('when the infographic was edited, should say so', () => {
    saved.state = { data: { sections: sections(3), edited: true } };

    render(<InfographicMeta documentId="d1" />);

    expect(screen.getByText('Editado')).toBeInTheDocument();
  });

  it('when the infographic was not edited, should not say so', () => {
    saved.state = { data: { sections: sections(3), edited: false } };

    render(<InfographicMeta documentId="d1" />);

    expect(screen.queryByText('Editado')).not.toBeInTheDocument();
  });

  it('when it appears, should fade in (opacity only) instead of showing up out of nowhere', () => {
    saved.state = { data: { sections: sections(2), edited: false } };

    const { container } = render(<InfographicMeta documentId="d1" />);

    expect(container.firstElementChild).toHaveClass('animate-enter-fade');
  });

  it('when rendered, should read the infographic of the given page', () => {
    render(<InfographicMeta documentId="pagina-9" />);

    expect(calls).toContain('pagina-9');
  });
});
