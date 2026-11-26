import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { component, setupStatus } from '#test/components-fixtures';

import { ComponentChecklist } from './ComponentChecklist';

describe('ComponentChecklist', () => {
  it('when listing, should group the components and mark the recommended ones', () => {
    render(
      <ComponentChecklist
        components={setupStatus().components}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Obrigatórios' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Aceleração por placa de vídeo' }),
    ).toBeInTheDocument();

    const models = screen.getByRole('region', { name: 'Modelos de transcrição' });

    expect(within(models).getByText('Recomendado')).toBeInTheDocument();
    expect(within(models).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('when the catalog has the video download tool, should list it in its own group', () => {
    render(
      <ComponentChecklist
        components={[
          component({
            id: 'yt-dlp',
            group: 'download',
            label: 'yt-dlp (vídeos de plataformas)',
            recommended: true,
          }),
        ]}
        selected={new Set(['yt-dlp'])}
        onToggle={vi.fn()}
      />,
    );

    const group = screen.getByRole('region', { name: 'Download de vídeos' });

    expect(within(group).getByText('yt-dlp (vídeos de plataformas)')).toBeInTheDocument();
    expect(within(group).getByRole('checkbox')).toBeChecked();
  });

  it('when the catalog has language data for scanned pdfs, should list it in its own group after the models', () => {
    render(
      <ComponentChecklist
        components={[
          component({ id: 'ocr-por-fast', group: 'ocr', label: 'Português (rápido)' }),
          component({ id: 'model-small', group: 'model', label: 'Modelo small' }),
        ]}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    const regions = screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));
    const group = screen.getByRole('region', { name: 'Leitura de PDF escaneado' });

    expect(regions).toEqual(['Modelos de transcrição', 'Leitura de PDF escaneado']);
    expect(within(group).getByText('Português (rápido)')).toBeInTheDocument();
    expect(within(group).getByRole('checkbox')).not.toBeChecked();
  });

  it('when a component is required, should show it checked and locked', () => {
    render(
      <ComponentChecklist
        components={setupStatus().components}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    const box = screen.getByRole('checkbox', { name: 'Transcrição' });

    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    expect(screen.getByText('Já incluído no app')).toBeInTheDocument();
  });

  it('when an optional component is already installed, should show it checked and locked even if not selected', () => {
    render(
      <ComponentChecklist
        components={[
          component({ id: 'yt-dlp', group: 'download', label: 'Download de vídeos', state: 'installed' }),
          component({ id: 'model-base', label: 'Modelo base', state: 'missing' }),
        ]}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    const installed = screen.getByRole('checkbox', { name: 'Download de vídeos' });

    expect(installed).toBeChecked();
    expect(installed).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Modelo base' })).not.toBeChecked();
  });

  it('when the user toggles a model, should call onToggle with its id', async () => {
    const onToggle = vi.fn();

    render(
      <ComponentChecklist
        components={setupStatus().components}
        selected={new Set(['model-small'])}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Modelo small' })).toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Modelo base' }));

    expect(onToggle).toHaveBeenCalledWith('model-base');
  });

  it('when locked, should disable every checkbox', () => {
    render(
      <ComponentChecklist
        components={setupStatus().components}
        selected={new Set()}
        onToggle={vi.fn()}
        locked
      />,
    );

    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeDisabled();
    }
  });

  it('when a component is downloading, should show the bar with bytes and percent', () => {
    render(
      <ComponentChecklist
        components={[
          component({
            state: 'downloading',
            progress: { receivedBytes: 243_800_983, totalBytes: 487_601_967 },
          }),
        ]}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Baixando Modelo small' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(screen.getByText(/\(50%\)/)).toBeInTheDocument();
  });

  it('when a component failed, should show the reason as an alert', () => {
    render(
      <ComponentChecklist
        components={[component({ state: 'failed', error: 'Arquivo corrompido.' })]}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Arquivo corrompido.');
  });

  it('when a component is installed, should lock its checkbox and show the active badge', () => {
    render(
      <ComponentChecklist
        components={[component({ state: 'installed', active: true })]}
        selected={new Set()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Modelo small' })).toBeDisabled();
    expect(screen.getByText('Em uso')).toBeInTheDocument();
  });

  it('when actions are given, should render them inside the item', () => {
    render(
      <ComponentChecklist
        components={[component({ state: 'installed' })]}
        selected={new Set()}
        onToggle={vi.fn()}
        actions={() => <button type="button">Remover</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
  });
});
