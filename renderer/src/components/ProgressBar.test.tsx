import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProgressBar, progressPercent } from './ProgressBar';

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

describe('ProgressBar', () => {
  it('when the total is known, should expose the rounded percentage and fill the bar to it', () => {
    render(<ProgressBar value={1} total={3} label="Copiando" />);

    const bar = screen.getByRole('progressbar', { name: 'Copiando' });

    expect(bar).toHaveAttribute('aria-valuenow', '33');
    expect(bar.firstElementChild).toHaveStyle({ width: '33%' });
  });

  it('when everything was processed, should be full', () => {
    render(<ProgressBar value={5} total={5} label="Copiando" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('when the value passes the total, should never go above 100%', () => {
    render(<ProgressBar value={9} total={5} label="Copiando" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('when the total is still unknown, should start empty at 0%, never a partial bar', () => {
    render(<ProgressBar value={0} total={0} label="Preparando" />);

    const bar = screen.getByRole('progressbar', { name: 'Preparando' });

    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar.firstElementChild).toHaveStyle({ width: '0%' });
    expect(bar.firstElementChild).not.toHaveClass('w-1/3');
    expect(bar.firstElementChild).not.toHaveClass('animate-pulse');
  });

  it('when a value arrives but the total is still unknown, should stay at 0%', () => {
    render(<ProgressBar value={7} total={0} label="Lendo" />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('when nothing was done yet, should be at 0%', () => {
    render(<ProgressBar value={0} total={12} label="Resumindo" />);

    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '0%' });
  });
});
