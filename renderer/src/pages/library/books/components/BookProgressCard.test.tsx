import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BookProgressCard } from './BookProgressCard';

describe('BookProgressCard', () => {
  it('when the book is in progress, should show the Progresso title with the bar', () => {
    render(<BookProgressCard read={3} total={10} />);

    expect(
      screen.getByText('Progresso', { selector: '[data-slot=card-title]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    expect(screen.getByText('3 de 10 capítulo(s) lidos · 30%')).toBeInTheDocument();
  });

  it('when the book is completed, should show only when it was completed', () => {
    render(<BookProgressCard read={10} total={10} completedAt="2026-11-14T10:00:00.000Z" />);

    expect(
      screen.getByText('Conclusão', { selector: '[data-slot=card-title]' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Concluído em 14/11/2026')).toBeInTheDocument();
    expect(screen.queryByText('Progresso')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/capítulo\(s\) lidos/)).not.toBeInTheDocument();
  });

  it('when the book is completed, should be compact with the status in front of the title on one row', () => {
    const { container } = render(
      <BookProgressCard read={10} total={10} completedAt="2026-11-14T10:00:00.000Z" />,
    );

    const card = container.firstElementChild as HTMLElement;
    const title = screen.getByText('Conclusão');
    const status = screen.getByText('Concluído em 14/11/2026');

    expect(card.className).not.toContain('min-h-24');
    expect(card).toHaveClass('gap-0', 'py-2.5');
    expect(title.parentElement).toBe(status.parentElement);
    expect(title.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.querySelector('[data-slot=card-header]')).toBeNull();
  });

  it('when the book is in progress, should keep the roomier card with the header', () => {
    const { container } = render(<BookProgressCard read={1} total={2} completedAt={null} />);

    expect(container.firstElementChild).toHaveClass('gap-2', 'py-3');
    expect(container.querySelector('[data-slot=card-header]')).not.toBeNull();
  });

  it('when completedAt is null, should still show the progress', () => {
    render(<BookProgressCard read={1} total={2} completedAt={null} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('when there is nothing to read, should render nothing', () => {
    const { container } = render(<BookProgressCard read={0} total={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('when in progress, should use the compact card spacing', () => {
    render(<BookProgressCard read={1} total={2} />);

    expect(document.querySelector('[data-slot=card]')).toHaveClass('py-3', 'gap-2');
  });

  it('when completed, should use an even tighter spacing', () => {
    render(<BookProgressCard read={2} total={2} completedAt="2026-11-14T10:00:00.000Z" />);

    expect(document.querySelector('[data-slot=card]')).toHaveClass('py-2.5', 'gap-0');
  });
});

describe('BookProgressCard — height', () => {
  const card = () => document.querySelector('[data-slot=card]') as HTMLElement;

  it('when in progress, should not force a minimum height', () => {
    render(<BookProgressCard read={1} total={2} />);

    expect(card().className).not.toContain('min-h-');
  });

  it('when completed, should not force a minimum height so the card stays short', () => {
    render(<BookProgressCard read={2} total={2} completedAt="2026-11-14T10:00:00.000Z" />);

    expect(card().className).not.toContain('min-h-');
  });

  it('when in progress or completed, should use the intense sidebar card style', () => {
    const { container, rerender } = render(<BookProgressCard read={1} total={2} />);

    expect(container.firstElementChild).toHaveClass('sidebar-card');

    rerender(<BookProgressCard read={2} total={2} completedAt="2026-11-14T10:00:00.000Z" />);

    expect(container.firstElementChild).toHaveClass('sidebar-card');
  });

  it('when completed, should write the date in the readable text color, not in a fixed gold that disappears on colored backgrounds', () => {
    render(<BookProgressCard read={2} total={2} completedAt="2026-11-14T10:00:00.000Z" />);

    const status = screen.getByText('Concluído em 14/11/2026');

    expect(status).toHaveClass('text-foreground', 'font-semibold');
    expect(status.className).not.toContain('amber');
  });
});
