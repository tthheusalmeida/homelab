import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  cellsPerRowFor,
  filledCells,
  MIN_CELLS_PER_ROW,
  ProgressBar,
  progressPercent,
} from './ProgressBar';

const cellsOf = (container: HTMLElement) => Array.from(container.querySelectorAll('.hp-cell'));
const filledOf = (container: HTMLElement) =>
  cellsOf(container).filter((cell) => cell.getAttribute('data-filled') === 'true');

describe('progressPercent', () => {
  it.each([
    [1, 3, 33],
    [5, 5, 100],
    [9, 5, 100],
    [0, 10, 0],
    [-4, 10, 0],
    [3, 0, 0],
    [3, -1, 0],
    [Number.NaN, 10, 0],
    [3, Number.NaN, 0],
  ])('when the value is %s of %s, should be %s%%', (value, total, expected) => {
    expect(progressPercent(value, total)).toBe(expected);
  });
});

describe('filledCells', () => {
  it.each([
    [0, 12, 0],
    [100, 12, 12],
    [50, 12, 6],
    [50, 40, 20],
    [1, 40, 1],
    [99, 12, 11],
    [99, 40, 39],
  ])('when it is %s%% of %s cells, should fill %s', (percent, cells, expected) => {
    expect(filledCells(percent, cells)).toBe(expected);
  });
});

describe('cellsPerRowFor', () => {
  it.each([
    [0, 20],
    [Number.NaN, 20],
    [100, 20],
    [144, 20],
    [288, 40],
    [576, 80],
  ])('when the width is %spx, should fit %s hexagons per row at the fixed size', (width, expected) => {
    // aceita a diferença de arredondamento de uma célula
    expect(Math.abs(cellsPerRowFor(width) - expected)).toBeLessThanOrEqual(1);
  });

  it('when the width grows, should add hexagons and never shrink below the minimum', () => {
    expect(cellsPerRowFor(900)).toBeGreaterThan(cellsPerRowFor(450));
    expect(cellsPerRowFor(10)).toBe(MIN_CELLS_PER_ROW);
  });
});

describe('ProgressBar width', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('when the container is wide, should draw more hexagons instead of bigger ones', () => {
    let notify: ResizeObserverCallback = () => undefined;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe() {
          notify([{ contentRect: { width: 576 } } as ResizeObserverEntry], this as never);
        }
        disconnect() {}
      },
    );

    const { container } = render(<ProgressBar value={0} total={5} label="Lendo" />);

    expect(container.querySelectorAll('.hp-cell').length).toBeGreaterThan(120);
  });
});

describe('ProgressBar', () => {
  it('when rendered, should draw two rows of twenty hexagons', () => {
    const { container } = render(<ProgressBar value={0} total={5} label="Copiando" />);
    const cells = cellsOf(container);
    const tops = new Set(cells.map((cell) => /^M[\d.]+ ([\d.]+)/.exec(cell.getAttribute('d') ?? '')?.[1]));

    expect(MIN_CELLS_PER_ROW).toBe(20);
    expect(cells).toHaveLength(40);
    // zigue-zague: as células alternam entre duas alturas (as duas fileiras)
    expect(tops.size).toBe(2);
  });

  it('when the total is known, should expose the rounded percentage and fill the matching cells', () => {
    const { container } = render(<ProgressBar value={1} total={4} label="Copiando" />);

    expect(screen.getByRole('progressbar', { name: 'Copiando' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(filledOf(container)).toHaveLength(10);
  });

  it('when everything was processed, should be full and pulse as complete', () => {
    const { container } = render(<ProgressBar value={5} total={5} label="Copiando" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-complete', 'true');
    expect(filledOf(container)).toHaveLength(40);
  });

  it('when it is complete and the pulse is turned off, should stay full and still', () => {
    render(<ProgressBar value={5} total={5} label="Copiando" pulse={false} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('data-complete', 'true');
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-pulse', 'false');
  });

  it('when it is not complete, should not pulse even with the pulse on', () => {
    render(<ProgressBar value={2} total={5} label="Copiando" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('data-pulse', 'false');
  });

  it('when the value passes the total, should never go above 100%', () => {
    render(<ProgressBar value={9} total={5} label="Copiando" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('when the total is still unknown, should start empty at 0%, with no cell filled or breathing', () => {
    const { container } = render(<ProgressBar value={0} total={0} label="Preparando" />);

    expect(screen.getByRole('progressbar', { name: 'Preparando' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(filledOf(container)).toHaveLength(0);
    expect(container.querySelector('[data-frontier="true"]')).toBeNull();
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-complete', 'false');
  });

  it('when a value arrives but the total is still unknown, should stay at 0%', () => {
    const { container } = render(<ProgressBar value={7} total={0} label="Lendo" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(filledOf(container)).toHaveLength(0);
  });

  it('when it is in the middle, should make only the next cell breathe', () => {
    const { container } = render(<ProgressBar value={1} total={2} label="Resumindo" />);
    const frontier = container.querySelectorAll('[data-frontier="true"]');

    expect(frontier).toHaveLength(1);
    expect(cellsOf(container).indexOf(frontier[0])).toBe(20);
  });

  it('when it is complete, should not leave a breathing cell', () => {
    const { container } = render(<ProgressBar value={2} total={2} label="Resumindo" />);

    expect(container.querySelector('[data-frontier="true"]')).toBeNull();
  });

  it('when it appears already filled, should not animate the cells that were already full', () => {
    const { container } = render(<ProgressBar value={1} total={2} label="Resumindo" />);

    expect(
      container.querySelectorAll('.hp-cell[data-filled="true"][data-still="true"]'),
    ).toHaveLength(20);
    expect(
      container.querySelectorAll('.hp-cell[data-filled="true"][data-still="false"]'),
    ).toHaveLength(0);
  });

  it('when it fills more with it on screen, should animate only the new cells', () => {
    const { container, rerender } = render(<ProgressBar value={1} total={4} label="Resumindo" />);

    rerender(<ProgressBar value={2} total={4} label="Resumindo" />);

    expect(
      container.querySelectorAll('.hp-cell[data-filled="true"][data-still="true"]'),
    ).toHaveLength(10);
    expect(
      container.querySelectorAll('.hp-cell[data-filled="true"][data-still="false"]'),
    ).toHaveLength(10);
  });

  it('when rendered, should keep the hexagons out of the accessibility tree', () => {
    const { container } = render(<ProgressBar value={1} total={2} label="Resumindo" />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
