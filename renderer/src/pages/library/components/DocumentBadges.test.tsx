import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { DocumentSummary } from '../types/library.types';

import { DocumentCard } from './DocumentCard';
import { GeneratedMarks } from './DocumentBadges';
import { tooltipTextOf } from '#test/tooltip';

const document = {
  id: 'd1',
  title: 'Redes',
  type: 'summary',
  source: 'video',
  status: 'published',
  category: ['TI'],
  tags: ['redes'],
  createdAt: '2026-03-10',
  updatedAt: '2026-03-10',
  fileName: 'redes.md',
  preview: 'Uma rede é um conjunto de computadores.',
} as unknown as DocumentSummary;

describe('GeneratedMarks', () => {
  it('when the page has neither, should show nothing', () => {
    const { container } = render(<GeneratedMarks document={{}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('when the page has only the infographic, should show only its mark', () => {
    render(<GeneratedMarks document={{ hasInfographic: true }} />);

    expect(screen.getByText('Infográfico')).toBeInTheDocument();
    expect(screen.queryByText('Mapa mental')).not.toBeInTheDocument();
  });

  it('when the page has only the mind map, should show only its mark', () => {
    render(<GeneratedMarks document={{ hasMindMap: true }} />);

    expect(screen.getByText('Mapa mental')).toBeInTheDocument();
    expect(screen.queryByText('Infográfico')).not.toBeInTheDocument();
  });

  it('when the page has both, should show one separate mark for each', () => {
    const { container } = render(
      <GeneratedMarks document={{ hasInfographic: true, hasMindMap: true }} />,
    );

    expect(container.querySelector('[data-mark="hasInfographic"]')).not.toBeNull();
    expect(container.querySelector('[data-mark="hasMindMap"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-mark]')).toHaveLength(2);
  });

  it('when the page has both, should show the mind map first and the infographic after', () => {
    const { container } = render(
      <GeneratedMarks document={{ hasInfographic: true, hasMindMap: true }} />,
    );

    const order = Array.from(container.querySelectorAll('[data-mark]')).map((mark) =>
      mark.getAttribute('data-mark'),
    );

    expect(order).toEqual(['hasMindMap', 'hasInfographic']);
  });

  it('when in icon mode with both, should also put the mind map icon first', () => {
    const { container } = render(
      <GeneratedMarks variant="icon" document={{ hasInfographic: true, hasMindMap: true }} />,
    );

    expect(
      Array.from(container.querySelectorAll('[data-mark]')).map((mark) =>
        mark.getAttribute('data-mark'),
      ),
    ).toEqual(['hasMindMap', 'hasInfographic']);
  });

  it('when a flag is false, should not show its mark', () => {
    render(<GeneratedMarks document={{ hasInfographic: false, hasMindMap: true }} />);

    expect(screen.queryByText('Infográfico')).not.toBeInTheDocument();
    expect(screen.getByText('Mapa mental')).toBeInTheDocument();
  });

  it('when in icon mode, should show only the icons with the name in the tooltip', async () => {
    render(<GeneratedMarks variant="icon" document={{ hasInfographic: true, hasMindMap: true }} />);

    expect(await tooltipTextOf(screen.getByRole('img', { name: 'Tem infográfico' }))).toBe(
      'Tem infográfico',
    );
    expect(await tooltipTextOf(screen.getByRole('img', { name: 'Tem mapa mental' }))).toBe(
      'Tem mapa mental',
    );
    expect(screen.queryByText('Infográfico')).not.toBeInTheDocument();
  });
});

describe('DocumentCard marks of generated content', () => {
  const withBoth = { ...document, hasInfographic: true, hasMindMap: true } as DocumentSummary;
  const renderCard = (doc: DocumentSummary, variant: 'list' | 'card' | 'grid') =>
    render(
      <MemoryRouter>
        <DocumentCard document={doc} variant={variant} />
      </MemoryRouter>,
    );

  it.each(['list', 'card'] as const)(
    'when it is the %s view and the page has both, should show both marks with their names',
    (variant) => {
      renderCard(withBoth, variant);

      expect(screen.getByText('Infográfico')).toBeInTheDocument();
      expect(screen.getByText('Mapa mental')).toBeInTheDocument();
    },
  );

  it('when it is the grid view and the page has both, should show both icons on the thumbnail', () => {
    renderCard(withBoth, 'grid');

    expect(screen.getByRole('img', { name: 'Tem infográfico' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tem mapa mental' })).toBeInTheDocument();
  });

  it.each(['list', 'card', 'grid'] as const)(
    'when it is the %s view and the page has none, should not show any mark',
    (variant) => {
      const { container } = renderCard(document, variant);

      expect(container.querySelectorAll('[data-mark]')).toHaveLength(0);
    },
  );

  it.each(['list', 'card', 'grid'] as const)(
    'when it is the %s view and the page has only the mind map, should show only that mark',
    (variant) => {
      const { container } = renderCard(
        { ...document, hasMindMap: true } as DocumentSummary,
        variant,
      );

      expect(container.querySelector('[data-mark="hasMindMap"]')).not.toBeNull();
      expect(container.querySelector('[data-mark="hasInfographic"]')).toBeNull();
    },
  );
});

describe('DocumentCard grid marks position', () => {
  const renderGrid = (doc: DocumentSummary) =>
    render(
      <MemoryRouter>
        <DocumentCard document={doc} variant="grid" />
      </MemoryRouter>,
    );
  const both = { ...document, hasMindMap: true, hasInfographic: true } as DocumentSummary;

  it('when the page has marks, should put them below the sheet and not inside it', () => {
    const { container } = renderGrid(both);
    const sheet = container.querySelector('[data-slot=paper-page]') as HTMLElement;
    const marks = container.querySelector('[data-mark="hasMindMap"]') as HTMLElement;

    expect(sheet).not.toContainElement(marks);
    expect(sheet.compareDocumentPosition(marks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('when the page has both, should show the mind map first and then the infographic under the sheet', () => {
    const { container } = renderGrid(both);

    expect(
      Array.from(container.querySelectorAll('[data-mark]')).map((mark) =>
        mark.getAttribute('data-mark'),
      ),
    ).toEqual(['hasMindMap', 'hasInfographic']);
  });

  it('when the page has marks, should not touch the category line nor the footer of the sheet', () => {
    renderGrid(both);

    expect(screen.getByText('TI').className).not.toMatch(/pr-/);
    expect(screen.getByText('TI')).not.toHaveAttribute('title');
    expect(screen.getByText('#redes').parentElement?.className).not.toContain('gap-1.5');
  });

  it('when the page has marks or not, should reserve the same fixed strip under the sheet so every card has the same height', () => {
    const withMarks = renderGrid(both);
    const stripWith = withMarks.container.querySelector('[data-mark]')?.parentElement
      ?.parentElement as HTMLElement;

    withMarks.unmount();

    const without = renderGrid(document);
    const strips = without.container.querySelectorAll('.h-5');

    expect(stripWith).toHaveClass('h-5', 'mt-2');
    expect(strips).toHaveLength(1);
    expect(strips[0]).toBeEmptyDOMElement();
  });

  it('when the marks are over the app background, should use the solid accent color so they contrast with the theme', () => {
    const { container } = renderGrid(both);
    const mark = container.querySelector('[data-mark="hasMindMap"]') as HTMLElement;

    expect(mark).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(mark.className).not.toContain('color-mix');
  });

  it('when the marks sit above the link that covers the card, should stay hoverable for their tooltip', async () => {
    const { container } = renderGrid(both);

    expect(container.querySelector('[data-mark="hasMindMap"]')).toHaveClass('relative', 'z-10');
    expect(
      await tooltipTextOf(container.querySelector('[data-mark="hasMindMap"]') as HTMLElement),
    ).toBe('Tem mapa mental');
  });
});
