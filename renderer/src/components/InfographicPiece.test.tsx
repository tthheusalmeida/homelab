import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { loadPieceShapes, resetPieceShapesForTests } from '#lib/infographic-piece-store';
import { INFOGRAPHIC_PIECE_SHAPES } from '#lib/infographic-pieces';

import { InfographicPiece, pieceFit, pieceName } from './InfographicPiece';

describe('InfographicPiece loading', () => {
  afterEach(async () => {
    // devolve o estado "carregado" que os testes das outras telas esperam
    await loadPieceShapes();
  });

  it('when the drawings have not arrived, should keep an empty space with the name and then draw the piece', async () => {
    resetPieceShapesForTests();

    const { container } = render(<InfographicPiece pieceKey="jogos.controle" />);
    const svg = screen.getByRole('img', { name: 'Controle de videogame' });

    expect(svg).toHaveAttribute('data-loading');
    expect(container.querySelector('.ig-f-b, .ig-f-s')).toBeNull();

    await act(async () => {
      await loadPieceShapes();
    });

    expect(svg).not.toHaveAttribute('data-loading');
    expect(container.querySelector('[class*="ig-f-"]')).not.toBeNull();
  });

  it('when the key is empty or unknown, should not wait for the drawings (it is only the hexagon)', () => {
    resetPieceShapesForTests();

    const { container } = render(<InfographicPiece pieceKey="inventada.coisa" />);

    expect(container.querySelector('svg')).not.toHaveAttribute('data-loading');
    expect(container.querySelectorAll('polygon.ig-f-s')).toHaveLength(1);
  });

  it('when asking the name of a piece, should answer from the catalog without the drawings', () => {
    resetPieceShapesForTests();

    expect(pieceName('jogos.controle')).toBe('Controle de videogame');
    expect(pieceName('')).toBe('Ilustração');
  });

  it('when loading the drawings many times, should fetch them once', async () => {
    resetPieceShapesForTests();

    await Promise.all([loadPieceShapes(), loadPieceShapes(), loadPieceShapes()]);

    const { container } = render(<InfographicPiece pieceKey="jogos.dado" />);

    expect(container.querySelector('[class*="ig-f-"]')).not.toBeNull();
  });
});

describe('InfographicPiece', () => {
  it('when the key exists, should draw the piece with its name as the accessible label', () => {
    render(<InfographicPiece pieceKey="jogos.controle" />);

    const svg = screen.getByRole('img', { name: 'Controle de videogame' });

    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    expect(svg).toHaveAttribute('data-piece', 'jogos.controle');
  });

  it('when drawing a piece, should paint the shapes with the tone classes of the app', () => {
    const { container } = render(<InfographicPiece pieceKey="protecao.escudo" />);

    expect(container.querySelector('.ig-f-b')).not.toBeNull();
    expect(container.querySelector('.ig-f-B')).not.toBeNull();
  });

  it('when drawing a piece, should put a sticker outline under it with the same shapes', () => {
    const { container } = render(<InfographicPiece pieceKey="protecao.escudo" />);
    const edges = container.querySelector('.ig-edges') as Element;

    expect(edges).not.toBeNull();
    expect(edges.querySelectorAll('.ig-edge, .ig-edgek').length).toBe(
      container.querySelectorAll('[class*="ig-f-"], .ig-k').length,
    );
  });

  it('when drawing a piece, should clip the facets to its filled shapes (without the light highlights)', () => {
    const { container } = render(<InfographicPiece pieceKey="protecao.escudo" />);
    const clip = container.querySelector('clipPath') as Element;
    const group = container.querySelector('g[clip-path]') as Element;

    expect(clip.children.length).toBeGreaterThan(0);
    expect(group.getAttribute('clip-path')).toBe(`url(#${clip.id})`);
    expect(group.querySelectorAll('polygon')).toHaveLength(50);
  });

  it('when the same piece is drawn twice, should draw the same facets (they never flicker)', () => {
    const first = render(<InfographicPiece pieceKey="jogos.dado" />);
    const a = first.container.querySelector('g[clip-path]')?.innerHTML;

    first.unmount();

    const second = render(<InfographicPiece pieceKey="jogos.dado" />);

    expect(second.container.querySelector('g[clip-path]')?.innerHTML).toBe(a);
  });

  it('when two pieces are drawn at the same time, should give each clip its own id', () => {
    const { container } = render(
      <>
        <InfographicPiece pieceKey="jogos.dado" />
        <InfographicPiece pieceKey="jogos.dado" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('clipPath')).map((clip) => clip.id);

    expect(new Set(ids).size).toBe(2);
  });

  it.each([
    ['vazia', ''],
    ['desconhecida', 'inventada.coisa'],
  ])('when the key is %s, should draw a soft hexagon instead of nothing', (_name, key) => {
    const { container } = render(<InfographicPiece pieceKey={key} />);

    expect(screen.getByRole('img', { name: 'Ilustração' })).toBeInTheDocument();
    expect(container.querySelectorAll('polygon.ig-f-s')).toHaveLength(1);
  });

  it('when drawing the cycle piece, should draw its three arrows', () => {
    const { container } = render(<InfographicPiece pieceKey="energia.ciclo" />);

    expect(container.querySelectorAll('path.ig-s-b')).toHaveLength(3);
    expect(container.querySelectorAll('polygon.ig-f-b')).toHaveLength(3);
  });

  it('when drawing any piece of the bank, should render without errors and with at least one shape', () => {
    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      const { container, unmount } = render(<InfographicPiece pieceKey={piece.key} />);

      expect(container.querySelectorAll('svg > g > g > *').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('when a shape is rotated, should wrap it in a rotated group and rotate it inside the clip', () => {
    const { container } = render(<InfographicPiece pieceKey="justica.martelo" />);

    expect(container.querySelector('g[transform^="rotate("]')).not.toBeNull();
    expect(container.querySelector('clipPath g')).toBeNull();
    expect(container.querySelector('clipPath [transform^="rotate("]')).not.toBeNull();
  });
});

describe('pieceFit', () => {
  it('when the piece is centered and medium, should keep it in the center', () => {
    const fit = pieceFit([25, 25, 50, 50]);

    expect(fit.x + fit.scale * 50).toBeCloseTo(50);
    expect(fit.y + fit.scale * 50).toBeCloseTo(50);
  });

  it('when the piece is huge, should shrink it but never below the minimum scale', () => {
    expect(pieceFit([0, 0, 200, 200]).scale).toBe(0.6);
  });

  it('when the piece is tiny, should enlarge it but never above the maximum scale', () => {
    expect(pieceFit([40, 40, 10, 10]).scale).toBe(1.3);
  });

  it('when the piece is off center, should move it to the center of the frame', () => {
    const fit = pieceFit([10, 20, 40, 30]);

    expect(fit.x + fit.scale * 30).toBeCloseTo(50);
    expect(fit.y + fit.scale * 35).toBeCloseTo(50);
  });
});
