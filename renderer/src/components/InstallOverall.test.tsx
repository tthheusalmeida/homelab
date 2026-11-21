import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { InstallOverall } from './InstallOverall';

const overall = { total: 4, done: 1, receivedBytes: 50 * 1024 * 1024, totalBytes: 200 * 1024 * 1024 };

describe('InstallOverall', () => {
  it('when rendered, should show how many items are done, the bytes and the percentage', () => {
    render(<InstallOverall overall={overall} />);

    expect(screen.getByRole('status')).toHaveTextContent('25%');
    expect(screen.getByRole('status')).toHaveTextContent(/50.*de.*200/);
  });

  it('when given a class, should apply it to the box', () => {
    render(<InstallOverall overall={overall} className="border" />);

    expect(screen.getByRole('status')).toHaveClass('border');
  });

  it('when rendered, should expose the progress bar with its name', () => {
    render(<InstallOverall overall={overall} />);

    expect(screen.getByRole('progressbar', { name: 'Progresso da instalação' })).toBeInTheDocument();
  });
});
