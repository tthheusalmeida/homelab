import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { INFOGRAPHIC_PIECES } from '#shared/infographic-pieces';

import { CatalogStrings, PieceCatalog } from './PieceCatalog';

describe('CatalogStrings', () => {
  it('when counting, should pluralize pieces and groups', () => {
    expect(CatalogStrings.count(1, 1)).toBe('1 peça em 1 grupo');
    expect(CatalogStrings.count(5, 2)).toBe('5 peças em 2 grupos');
    expect(CatalogStrings.count(0, 0)).toBe('0 peças em 0 grupos');
  });
});

describe('PieceCatalog', () => {
  it('when opened, should list every piece grouped by theme', () => {
    render(<PieceCatalog />);

    expect(screen.getByText(`${INFOGRAPHIC_PIECES.length} peças em 21 grupos`)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Finanças' })).toBeInTheDocument();
  });

  it('when only viewing, should not make the pieces buttons', () => {
    render(<PieceCatalog />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('when showing details, should show the key and the keywords of each piece', () => {
    render(<PieceCatalog />);

    expect(screen.getByText('financas.calculadora')).toBeInTheDocument();
    expect(screen.getByText(/conta cálculo orçamento/)).toBeInTheDocument();
  });

  it('when details are off, should show only the name', () => {
    render(<PieceCatalog details={false} />);

    expect(screen.queryByText('financas.calculadora')).not.toBeInTheDocument();
    expect(screen.getByText('Calculadora')).toBeInTheDocument();
  });

  it('when picking is on, should make each piece a button that hands its key over', async () => {
    const onPick = vi.fn();

    render(<PieceCatalog onPick={onPick} details={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Calculadora/ }));

    expect(onPick).toHaveBeenCalledWith('financas.calculadora');
  });

  it('when a piece is selected, should mark only it as pressed', () => {
    render(<PieceCatalog onPick={vi.fn()} selected="financas.calculadora" details={false} />);

    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Calculadora/, pressed: true })).toBeInTheDocument();
  });

  it('when searching without accents or case, should find the pieces', async () => {
    render(<PieceCatalog />);

    await userEvent.type(screen.getByRole('searchbox'), 'ORCAMENTO');

    expect(screen.getByText('financas.calculadora')).toBeInTheDocument();
    expect(screen.queryByText('jogos.controle')).not.toBeInTheDocument();
  });

  it('when the drawings are still waiting to be shown, should still list, count and search every piece', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );

    const { container } = render(<PieceCatalog />);

    expect(container.querySelectorAll('[data-slot="lazy-render"][data-ready="false"]').length).toBe(
      INFOGRAPHIC_PIECES.length,
    );
    expect(screen.getByText(`${INFOGRAPHIC_PIECES.length} peças em 21 grupos`)).toBeInTheDocument();

    await userEvent.type(screen.getByRole('searchbox'), 'orcamento');

    expect(screen.getByText('financas.calculadora')).toBeInTheDocument();
    expect(screen.getByText('negocios.calculadora')).toBeInTheDocument();
    expect(screen.queryByText('jogos.controle')).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('when nothing matches, should say so', async () => {
    render(<PieceCatalog />);

    await userEvent.type(screen.getByRole('searchbox'), 'xyzxyzxyz');

    expect(screen.getByRole('status')).toHaveTextContent(CatalogStrings.empty);
  });
});

describe('PieceCatalog search row', () => {
  it('when a class is given for the search row, should apply it to the row with the search and the count', () => {
    render(<PieceCatalog searchClassName="sticky top-0" />);

    const row = screen.getByRole('searchbox').closest('.sticky');

    expect(row).not.toBeNull();
    expect(row).toContainElement(screen.getByText(/peças em 21 grupos/));
  });

  it('when no class is given, should not make the search row sticky', () => {
    render(<PieceCatalog />);

    expect(screen.getByRole('searchbox').closest('.sticky')).toBeNull();
  });
});

describe('PieceCatalog fixed size', () => {
  it('when listing the pieces, should give every card the same height and the name a fixed two-line box', () => {
    render(<PieceCatalog onPick={vi.fn()} details={false} />);

    const cards = screen.getAllByRole('button');

    expect(cards.length).toBe(INFOGRAPHIC_PIECES.length);

    for (const card of cards) {
      expect(card).toHaveClass('h-full', 'w-full');
      expect(card.querySelector('b')).toHaveClass('line-clamp-2');
      expect(card.querySelector('b')?.parentElement).toHaveClass('h-9');
    }
  });

  it('when a name is long, should keep it whole in the tooltip of the card', () => {
    render(<PieceCatalog onPick={vi.fn()} details={false} />);

    expect(screen.getByTitle('Câmera de segurança')).toBeInTheDocument();
    expect(screen.getByTitle('Controle de videogame')).toBeInTheDocument();
  });

  it('when only viewing, should also give each card the tooltip and the same size', () => {
    render(<PieceCatalog />);

    const card = screen.getByTitle('Notebook');

    expect(card).toHaveClass('h-full');
  });
});
