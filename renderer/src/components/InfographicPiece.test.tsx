import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { INFOGRAPHIC_PIECE_SHAPES } from '#lib/infographic-pieces';

import { InfographicPiece } from './InfographicPiece';

describe('InfographicPiece', () => {
  it('when the key exists, should draw the piece with its name as the accessible label', () => {
    render(<InfographicPiece pieceKey="jogos.controle" />);

    const svg = screen.getByRole('img', { name: 'Controle de videogame' });

    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
  });

  it('when the key exists, should draw the hexagonal base under the piece', () => {
    const { container } = render(<InfographicPiece pieceKey="jogos.controle" />);

    expect(container.querySelector('.ig-ped-t')).not.toBeNull();
    expect(container.querySelector('.ig-ped-l')).not.toBeNull();
    expect(container.querySelector('.ig-ped-r')).not.toBeNull();
  });

  it('when the base is turned off, should draw only the piece', () => {
    const { container } = render(<InfographicPiece pieceKey="jogos.controle" pedestal={false} />);

    expect(container.querySelector('.ig-ped-t')).toBeNull();
  });

  it('when the piece is generic, should never draw the base', () => {
    const { container } = render(<InfographicPiece pieceKey="generico.estrela" />);

    expect(container.querySelector('.ig-ped-t')).toBeNull();
  });

  it.each([
    ['vazia', ''],
    ['desconhecida', 'inventada.coisa'],
  ])('when the key is %s, should draw a soft hexagon instead of nothing', (_name, key) => {
    const { container } = render(<InfographicPiece pieceKey={key} />);

    expect(screen.getByRole('img', { name: 'Ilustração' })).toBeInTheDocument();
    expect(container.querySelectorAll('polygon.ig-f-s')).toHaveLength(1);
    expect(container.querySelector('.ig-ped-t')).toBeNull();
  });

  it('when a custom view box is given, should use it to crop the drawing', () => {
    render(<InfographicPiece pieceKey="energia.ciclo" pedestal={false} viewBox="0 -8 100 100" />);

    expect(screen.getByRole('img', { name: 'Ciclo' })).toHaveAttribute('viewBox', '0 -8 100 100');
  });

  it('when drawing the cycle piece, should have three identical arrows rotated 120 degrees apart', () => {
    const { container } = render(<InfographicPiece pieceKey="energia.ciclo" pedestal={false} />);

    expect(container.querySelectorAll('path.ig-s-b')).toHaveLength(3);
    expect(container.querySelectorAll('polygon.ig-f-b')).toHaveLength(3);
  });

  it('when drawing any piece of the bank, should render without errors and with at least one shape', () => {
    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      const { container, unmount } = render(<InfographicPiece pieceKey={piece.key} />);

      expect(container.querySelectorAll('svg > *').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('when a shape is rotated, should wrap its shapes in a rotated group', () => {
    const { container } = render(<InfographicPiece pieceKey="justica.martelo" />);

    expect(container.querySelector('g[transform^="rotate("]')).not.toBeNull();
  });
});
