import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { INFOGRAPHIC_PIECES } from '#shared/infographic-pieces';

import { InfographicGallerySection } from './InfographicGallerySection';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InfographicGallerySection', () => {
  it('when opened, should show the models tab with the sample infographic and its ten sections', () => {
    render(<InfographicGallerySection />);

    expect(screen.getByRole('button', { name: 'Modelos', pressed: true })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /O orçamento e a economia do/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Parte \d+ de 10$/)).toHaveLength(10);
  });

  it('when opened, should list one shortcut for each of the ten models', () => {
    render(<InfographicGallerySection />);

    const index = screen.getByRole('group', { name: 'Ir para um modelo' });

    expect(within(index).getAllByRole('button')).toHaveLength(10);
    expect(within(index).getByRole('button', { name: 'Ciclo' })).toBeInTheDocument();
  });

  it('when a model shortcut is clicked, should scroll to that section of the sample', async () => {
    const scroll = vi.fn();

    Element.prototype.scrollIntoView = scroll;
    render(<InfographicGallerySection />);

    await userEvent.click(screen.getByRole('button', { name: 'Comparativo' }));

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(screen.getByRole('region', { name: /Cortar gastos/ }));
  });

  it('when the pieces tab is opened, should show every piece of the bank with its key', async () => {
    render(<InfographicGallerySection />);

    await userEvent.click(screen.getByRole('button', { name: 'Peças' }));

    expect(screen.getByText(`${INFOGRAPHIC_PIECES.length} peças em 21 grupos`)).toBeInTheDocument();
    expect(screen.getByText('financas.calculadora')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Finanças' })).toBeInTheDocument();
  });

  it('when searching, should keep only the pieces that match, ignoring accents and case', async () => {
    render(<InfographicGallerySection />);
    await userEvent.click(screen.getByRole('button', { name: 'Peças' }));

    await userEvent.type(screen.getByRole('searchbox'), 'ORCAMENTO');

    expect(screen.getByText('financas.calculadora')).toBeInTheDocument();
    expect(screen.queryByText('jogos.controle')).not.toBeInTheDocument();
    expect(screen.getByText(/peça(s)? em \d+ grupo/)).toBeInTheDocument();
  });

  it('when searching by the key of a piece, should find it', async () => {
    render(<InfographicGallerySection />);
    await userEvent.click(screen.getByRole('button', { name: 'Peças' }));

    await userEvent.type(screen.getByRole('searchbox'), 'jogos.controle');

    expect(screen.getByText('1 peça em 1 grupo')).toBeInTheDocument();
    expect(screen.getByText('Controle de videogame')).toBeInTheDocument();
  });

  it('when nothing matches the search, should say that no piece was found', async () => {
    render(<InfographicGallerySection />);
    await userEvent.click(screen.getByRole('button', { name: 'Peças' }));

    await userEvent.type(screen.getByRole('searchbox'), 'xyzxyzxyz');

    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma peça encontrada');
    expect(screen.getByText('0 peças em 0 grupos')).toBeInTheDocument();
  });

  it('when going back to the models tab, should show the sample again', async () => {
    render(<InfographicGallerySection />);
    await userEvent.click(screen.getByRole('button', { name: 'Peças' }));

    await userEvent.click(screen.getByRole('button', { name: 'Modelos' }));

    expect(screen.getAllByText(/^Parte \d+ de 10$/)).toHaveLength(10);
  });
});
