import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { hardware } from '#test/components-fixtures';

import { HardwareCard } from './HardwareCard';

describe('HardwareCard', () => {
  it('when there is a GPU, should show its name, kind, video memory, RAM and the recommendation', () => {
    render(<HardwareCard hardware={hardware()} />);

    expect(
      screen.getByText(/NVIDIA GeForce RTX 3060 \(dedicada, 12 GB de vídeo\)/),
    ).toBeInTheDocument();
    expect(screen.getByText('32 GB de memória')).toBeInTheDocument();
    expect(screen.getByText(/Marcamos a aceleração CUDA/)).toBeInTheDocument();
  });

  it('when no GPU was identified, should say so', () => {
    render(<HardwareCard hardware={hardware({ gpus: [] })} />);

    expect(screen.getByText('Placa de vídeo não identificada')).toBeInTheDocument();
  });
});
