import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MindMap } from '#lib/mind-map';

const capture = vi.hoisted(() => vi.fn());

vi.mock('#lib/mind-map-image', () => ({
  captureMindMapPng: capture,
  mindMapImageName: (title: string, transparent = false) =>
    `Mapa mental - ${title}${transparent ? ' (sem fundo)' : ''}`,
}));

import { MindMapView } from './MindMapView';

const map: MindMap = {
  title: 'Genética',
  subtitle: 'Estuda a hereditariedade',
  size: 5,
  nodes: [
    {
      label: 'DNA',
      note: 'Material genético do indivíduo.',
      children: [
        {
          label: 'Genes',
          note: 'Segmento de DNA.',
          children: [{ label: 'Alelos', note: 'Formas do mesmo gene', children: [] }],
        },
      ],
    },
    { label: 'Núcleo', note: 'Onde os cromossomos ficam.', children: [] },
    { label: 'Haploide', children: [] },
  ],
};

/** O mapa só desenha as setas e os dois lados quando o quadro é largo (medido na tela). */
function mockWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 400,
    top: 0,
    left: 0,
    right: width,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MindMapView', () => {
  it('when rendered, should show the title and subtitle in the middle', () => {
    render(<MindMapView map={map} />);

    expect(screen.getByRole('heading', { name: 'Genética' })).toBeInTheDocument();
    expect(screen.getByText('Estuda a hereditariedade')).toBeInTheDocument();
  });

  it('when rendered, should show every branch with its term, number and note', () => {
    render(<MindMapView map={map} />);

    const dna = screen.getByRole('region', { name: 'DNA' });

    expect(within(dna).getByText('DNA')).toBeInTheDocument();
    expect(within(dna).getByText('1')).toBeInTheDocument();
    expect(within(dna).getByText('Material genético do indivíduo.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Núcleo' })).getByText('2'),
    ).toBeInTheDocument();
  });

  it('when a branch has details, should show sub-terms with their notes and the third level as arrow lines', () => {
    render(<MindMapView map={map} />);

    const dna = screen.getByRole('region', { name: 'DNA' });

    expect(within(dna).getByText('Genes')).toBeInTheDocument();
    expect(within(dna).getByText('Segmento de DNA.')).toBeInTheDocument();
    expect(within(dna).getByText('Alelos')).toBeInTheDocument();
    expect(within(dna).getByText(/Formas do mesmo gene/)).toBeInTheDocument();
  });

  it('when the text has HTML, should show it as plain text and never as markup', () => {
    render(
      <MindMapView
        map={{ title: '<b>x</b>', size: 1, nodes: [{ label: '<img src=x>', children: [] }] }}
      />,
    );

    expect(screen.getByRole('heading', { name: '<b>x</b>' })).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });

  it('when the user clicks the term of a branch, should hide and show its details', async () => {
    render(<MindMapView map={map} />);

    const term = screen.getByRole('button', { name: /DNA/ });

    expect(term).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(term);

    expect(screen.queryByText('Genes')).not.toBeInTheDocument();
    expect(term).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(term);

    expect(screen.getByText('Genes')).toBeInTheDocument();
  });

  it('when a branch has no details, should not be collapsible', () => {
    render(<MindMapView map={map} />);

    const term = screen.getByRole('button', { name: /Núcleo/ });

    expect(term).toBeDisabled();
    expect(term).not.toHaveAttribute('aria-expanded');
  });

  it('when the user clicks Recolher, should close every branch and offer Expandir tudo', async () => {
    render(<MindMapView map={map} />);

    await userEvent.click(screen.getByRole('button', { name: 'Recolher todos os ramos' }));

    expect(screen.queryByText('Genes')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expandir todos os ramos' }));

    expect(screen.getByText('Genes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recolher todos os ramos' })).toBeInTheDocument();
  });

  it('when the map is large, should open with the branches closed', () => {
    render(<MindMapView map={{ ...map, size: 120 }} />);

    expect(screen.queryByText('Genes')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expandir todos os ramos' })).toBeInTheDocument();
  });

  it('when the map changes, should start over from its initial state', async () => {
    const { rerender } = render(<MindMapView map={map} />);

    await userEvent.click(screen.getByRole('button', { name: 'Recolher todos os ramos' }));
    rerender(<MindMapView map={{ ...map, title: 'Outro' }} />);

    expect(screen.getByText('Genes')).toBeInTheDocument();
  });

  const stageOf = () => screen.getByRole('group', { name: 'Mapa mental de Genética' });
  const frameOf = () => stageOf().parentElement as HTMLElement;
  const transformOf = () => stageOf().style.transform;

  it('when the user zooms with the buttons, should grow and shrink the map within the limits', async () => {
    render(<MindMapView map={map} />);

    const bigger = screen.getByRole('button', { name: 'Aumentar o mapa' });
    const smaller = screen.getByRole('button', { name: 'Diminuir o mapa' });

    expect(transformOf()).toContain('scale(1)');

    await userEvent.click(bigger);
    expect(transformOf()).toContain('scale(1.2)');

    await userEvent.click(smaller);
    await userEvent.click(smaller);
    expect(transformOf()).toMatch(/scale\(0\.83/);

    for (let step = 0; step < 10; step += 1) {
      await userEvent.click(smaller);
    }

    expect(transformOf()).toContain('scale(0.35)');
    expect(smaller).toBeDisabled();

    for (let step = 0; step < 15; step += 1) {
      await userEvent.click(bigger);
    }

    expect(transformOf()).toContain('scale(2.5)');
    expect(bigger).toBeDisabled();
  });

  it('when the user rolls the mouse wheel over the map, should zoom it and stop the page from scrolling', () => {
    render(<MindMapView map={map} />);

    const notPrevented = fireEvent.wheel(frameOf(), { deltaY: -300, clientX: 0, clientY: 0 });

    expect(notPrevented).toBe(false);
    expect(Number(/scale\(([\d.]+)\)/.exec(transformOf())?.[1])).toBeGreaterThan(1);

    fireEvent.wheel(frameOf(), { deltaY: 3000, clientX: 0, clientY: 0 });

    expect(Number(/scale\(([\d.]+)\)/.exec(transformOf())?.[1])).toBeLessThan(1);
  });

  it('when the user drags the map, should move it with the pointer', () => {
    render(<MindMapView map={map} />);

    fireEvent.pointerDown(frameOf(), { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(frameOf(), { clientX: 150, clientY: 130, pointerId: 1 });

    expect(transformOf()).toContain('translate(82px, 62px)');
    expect(frameOf()).toHaveAttribute('data-dragging', 'true');

    fireEvent.pointerUp(frameOf(), { clientX: 150, clientY: 130, pointerId: 1 });

    expect(frameOf()).toHaveAttribute('data-dragging', 'false');
    expect(transformOf()).toContain('translate(82px, 62px)');
  });

  it('when the pointer barely moves, should not count as a drag', () => {
    render(<MindMapView map={map} />);

    fireEvent.pointerDown(frameOf(), { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(frameOf(), { clientX: 102, clientY: 101, pointerId: 1 });

    expect(transformOf()).toContain('translate(32px, 32px)');
    expect(frameOf()).toHaveAttribute('data-dragging', 'false');
  });

  it('when another mouse button is pressed, should not drag', () => {
    render(<MindMapView map={map} />);

    fireEvent.pointerDown(frameOf(), { clientX: 100, clientY: 100, button: 2, pointerId: 1 });
    fireEvent.pointerMove(frameOf(), { clientX: 200, clientY: 200, pointerId: 1 });

    expect(transformOf()).toContain('translate(32px, 32px)');
  });

  it('when the user lets go after dragging from a term, should not toggle that branch', () => {
    render(<MindMapView map={map} />);

    const term = screen.getByRole('button', { name: /DNA/ });

    fireEvent.pointerDown(term, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(term, { clientX: 160, clientY: 160, pointerId: 1 });
    fireEvent.pointerUp(term, { clientX: 160, clientY: 160, pointerId: 1 });
    fireEvent.click(term);

    expect(term).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(term);

    expect(term).toHaveAttribute('aria-expanded', 'false');
  });

  it('when the user clicks Ajustar, should scale the whole map down to fit the area', async () => {
    mockWidth(1000);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(1000);

    render(<MindMapView map={map} />);

    // abre já ajustado: 936 / 2000 de largura é o limite (a altura dá 0,536)
    expect(transformOf()).toMatch(/scale\(0\.468\)/);

    await userEvent.click(screen.getByRole('button', { name: 'Aumentar o mapa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar o mapa à tela' }));

    expect(transformOf()).toMatch(/scale\(0\.468\)/);
  });

  it('when the map is small, should open at normal size and centered', () => {
    mockWidth(1000);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);

    render(<MindMapView map={map} />);

    expect(transformOf()).toContain('translate(100px, 150px) scale(1)');
  });

  it('when an overlay is given, should cover the map area with it', () => {
    render(<MindMapView map={map} overlay={<span>Gerando…</span>} />);

    expect(frameOf()).toContainElement(screen.getByText('Gerando…'));
  });

  it('when there is no overlay, should not cover the map', () => {
    render(<MindMapView map={map} />);

    expect(screen.queryByText('Gerando…')).not.toBeInTheDocument();
  });

  it('when rendered, should align every branch to the left, on both sides of the title', () => {
    mockWidth(1100);

    const { container } = render(<MindMapView map={map} />);

    expect(container.querySelector('.text-right')).toBeNull();
    expect(container.querySelector('.flex-row-reverse')).toBeNull();
    for (const section of container.querySelectorAll('section')) {
      expect(section).toHaveClass('text-left');
    }
  });

  it('when the area is narrow, should stack the branches in one column without arrows', () => {
    mockWidth(500);

    const { container } = render(<MindMapView map={map} />);

    expect(container.querySelector('svg path[marker-end]')).toBeNull();
    expect(container.querySelector('.grid-cols-\\[1fr_auto_1fr\\]')).toBeNull();
  });

  it('when the area is wide, should put the title in the middle with an arrow to each branch', () => {
    mockWidth(1100);

    const { container } = render(<MindMapView map={map} />);

    expect(container.querySelector('.grid-cols-\\[1fr_auto_1fr\\]')).not.toBeNull();
    expect(container.querySelectorAll('svg path[marker-end]')).toHaveLength(map.nodes.length);
  });

  it('when there are no branches, should show only the title', () => {
    render(<MindMapView map={{ title: 'Vazio', size: 0, nodes: [] }} />);

    expect(screen.getByRole('heading', { name: 'Vazio' })).toBeInTheDocument();
    expect(screen.queryAllByRole('region')).toHaveLength(0);
  });
});

describe('MindMapView controls bar', () => {
  it('when rendered, should keep every control in a bottom bar inside the area and no hint above it', () => {
    render(
      <div style={{ height: 600 }}>
        <MindMapView map={map} />
      </div>,
    );

    const bar = screen.getByRole('toolbar', { name: 'Controles do mapa' });
    const frame = screen.getByRole('group', { name: 'Mapa mental de Genética' }).parentElement;

    expect(frame).toContainElement(bar);
    expect(bar).toHaveClass('bottom-5');
    for (const name of [
      'Diminuir o mapa',
      'Aumentar o mapa',
      'Ajustar o mapa à tela',
      'Recolher todos os ramos',
    ]) {
      expect(within(bar).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByText(/Arraste para mover/)).not.toBeInTheDocument();
  });

  it('when rendered, should fill the parent (the page decides the size and the border)', () => {
    const { container } = render(<MindMapView map={map} />);

    expect(container.firstElementChild).toHaveClass('h-full');
    expect(screen.getByRole('group').parentElement).toHaveClass('h-full');
    expect(screen.getByRole('group').parentElement).not.toHaveClass('border');
  });

  it('when rendered, should show the zoom percentage between the zoom buttons', async () => {
    render(<MindMapView map={map} />);

    const bar = screen.getByRole('toolbar');

    expect(within(bar).getByLabelText('Tamanho do mapa')).toHaveTextContent('100%');

    await userEvent.click(within(bar).getByRole('button', { name: 'Aumentar o mapa' }));

    expect(within(bar).getByLabelText('Tamanho do mapa')).toHaveTextContent('120%');
  });

  it('when a toolbar is given, should show it first among the controls', () => {
    render(<MindMapView map={map} toolbar={<button type="button">Gerar de novo</button>} />);

    const bar = screen.getByRole('toolbar');

    expect(bar.firstElementChild).toBe(within(bar).getByRole('button', { name: 'Gerar de novo' }));
  });

  it('when a notice is given, should show it floating over the area', () => {
    render(<MindMapView map={map} notice={<p>Aviso do mapa</p>} />);

    expect(screen.getByRole('group').parentElement).toContainElement(
      screen.getByText('Aviso do mapa'),
    );
  });

  it('when the controls bar is pressed, should not start dragging the map', () => {
    render(<MindMapView map={map} />);

    const bar = screen.getByRole('toolbar');
    const stage = screen.getByRole('group');

    fireEvent.pointerDown(bar, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(bar, { clientX: 300, clientY: 300, pointerId: 1 });

    expect(stage.style.transform).toContain('translate(32px, 32px)');
  });

  it('when inside an area with its own font size, should keep a fixed size of its own', () => {
    render(
      <div style={{ fontSize: '32px' }}>
        <MindMapView map={map} />
      </div>,
    );

    expect(screen.getByRole('group').parentElement).toHaveStyle({ fontSize: '16px' });
  });

  it('when rendered, should give the central node a roomy box with the title and subtitle inside', () => {
    render(<MindMapView map={map} />);

    const hub = screen.getByRole('heading', { name: 'Genética' }).parentElement as HTMLElement;

    expect(hub).toHaveClass('rounded-2xl', 'border');
    expect(hub.className).toMatch(/px-\[1\.6em\]/);
    expect(within(hub).getByText('Estuda a hereditariedade')).toBeInTheDocument();
  });
});

describe('MindMapView PNG download', () => {
  beforeEach(() => {
    capture.mockReset();
    capture.mockResolvedValue('UE5H');
  });

  it('when no saver is given, should not offer the download button', () => {
    render(<MindMapView map={map} />);

    expect(
      screen.queryByRole('button', { name: 'Baixar o mapa como PNG com fundo' }),
    ).not.toBeInTheDocument();
  });

  it('when a saver is given, should offer Baixar PNG in the bottom bar', () => {
    render(<MindMapView map={map} onDownloadImage={vi.fn()} />);

    expect(
      within(screen.getByRole('toolbar')).getByRole('button', {
        name: 'Baixar o mapa como PNG com fundo',
      }),
    ).toBeInTheDocument();
  });

  it('when the user clicks Baixar PNG, should photograph the whole map and hand the PNG over with a suggested name', async () => {
    const onDownloadImage = vi.fn().mockResolvedValue(undefined);

    render(<MindMapView map={map} onDownloadImage={onDownloadImage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    await waitFor(() => expect(onDownloadImage).toHaveBeenCalledTimes(1));

    expect(capture).toHaveBeenCalledWith(
      screen.getByRole('group', { name: 'Mapa mental de Genética' }),
      expect.any(String),
    );
    expect(capture.mock.calls[0][1]).not.toBeNull();
    expect(onDownloadImage).toHaveBeenCalledWith({
      fileName: 'Mapa mental - Genética',
      dataBase64: 'UE5H',
    });
  });

  it('when the image is being made, should disable the button with a loading label and not start twice', async () => {
    let finish: () => void = () => undefined;
    const onDownloadImage = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));

    render(<MindMapView map={map} onDownloadImage={onDownloadImage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    const busy = await screen.findByRole('button', { name: 'Gerando imagem…' });

    expect(busy).toBeDisabled();

    await userEvent.click(busy);
    expect(capture).toHaveBeenCalledTimes(1);

    finish();

    expect(
      await screen.findByRole('button', { name: 'Baixar o mapa como PNG com fundo' }),
    ).toBeEnabled();
  });

  it('when the capture fails, should report the error, not hand anything over and free the button', async () => {
    capture.mockRejectedValue(new Error('Falha ao desenhar.'));

    const onDownloadImage = vi.fn();
    const onDownloadError = vi.fn();

    render(
      <MindMapView map={map} onDownloadImage={onDownloadImage} onDownloadError={onDownloadError} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    await waitFor(() => expect(onDownloadError).toHaveBeenCalledWith('Falha ao desenhar.'));

    expect(onDownloadImage).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('button', { name: 'Baixar o mapa como PNG com fundo' }),
    ).toBeEnabled();
  });

  it('when saving fails, should report the message of the failure', async () => {
    const onDownloadError = vi.fn();

    render(
      <MindMapView
        map={map}
        onDownloadImage={vi.fn().mockRejectedValue(new Error('Disco cheio.'))}
        onDownloadError={onDownloadError}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    await waitFor(() => expect(onDownloadError).toHaveBeenCalledWith('Disco cheio.'));
  });

  it('when the failure has no message, should report a default one', async () => {
    const onDownloadError = vi.fn();

    capture.mockRejectedValue('x');
    render(<MindMapView map={map} onDownloadImage={vi.fn()} onDownloadError={onDownloadError} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    await waitFor(() =>
      expect(onDownloadError).toHaveBeenCalledWith(
        'Não foi possível gerar a imagem do mapa. Tente de novo.',
      ),
    );
  });
});

describe('MindMapView icon-only controls', () => {
  it('when rendered, should show only icons in every control of the bar', () => {
    render(<MindMapView map={map} onDownloadImage={vi.fn()} toolbar={<span>x</span>} />);

    const buttons = within(screen.getByRole('toolbar')).getAllByRole('button');

    expect(buttons.length).toBeGreaterThanOrEqual(5);
    for (const button of buttons) {
      expect(button).toHaveTextContent('');
      expect(button).toHaveAccessibleName();
      expect(button.querySelector('svg')).not.toBeNull();
    }
  });

  it('when the mouse goes over a control, should show a tooltip with its action', async () => {
    render(<MindMapView map={map} />);

    await userEvent.hover(screen.getByRole('button', { name: 'Ajustar o mapa à tela' }));

    expect(
      await screen.findByText('Ajustar o mapa à tela', {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toBeInTheDocument();
  });

  it('when the branches are closed, the tooltip of the toggle should say it expands them', async () => {
    render(<MindMapView map={map} />);

    await userEvent.click(screen.getByRole('button', { name: 'Recolher todos os ramos' }));
    await userEvent.hover(screen.getByRole('button', { name: 'Expandir todos os ramos' }));

    expect(
      await screen.findByText('Expandir todos os ramos', {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toBeInTheDocument();
  });

  it('when the image is being made, should show the loading icon and the working label', async () => {
    capture.mockImplementation(() => new Promise(() => undefined));

    render(<MindMapView map={map} onDownloadImage={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    const busy = await screen.findByRole('button', { name: 'Gerando imagem…' });

    expect(busy).toBeDisabled();
    expect(busy).toHaveTextContent('');
  });
});

describe('MindMapView centering', () => {
  /** Tamanhos medidos na tela: a área (frame) e o desenho (stage). */
  function mockLayout(layout: { frame: [number, number]; stage: [number, number] }) {
    const [frameW, frameH] = layout.frame;
    const [stageW, stageH] = layout.stage;

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: frameW,
      height: frameH,
      top: 0,
      left: 0,
      right: frameW,
      bottom: frameH,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(frameW);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(frameH);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(stageW);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(stageH);
  }

  const transform = () => screen.getByRole('group').style.transform;

  it('when rendered, should size the drawing by its content (not by the area) so the title stays in the middle', () => {
    render(<MindMapView map={map} />);

    const stage = screen.getByRole('group');

    expect(stage).toHaveClass('w-max');
    expect(stage.style.width).toBe('');
  });

  it('when the wide drawing is smaller than the area, should center it on both axes', () => {
    mockLayout({ frame: [1400, 800], stage: [1310, 500] });

    render(<MindMapView map={map} />);

    expect(transform()).toContain('translate(45px, 150px) scale(1)');
  });

  it('when the drawing is wider than the area, should shrink it to fit and keep it centered', () => {
    mockLayout({ frame: [1100, 800], stage: [1310, 500] });

    render(<MindMapView map={map} />);

    const scale = (1100 - 64) / 1310;

    expect(transform()).toContain(`scale(${scale})`);
    expect(transform()).toContain(
      `translate(${(1100 - 1310 * scale) / 2}px, ${(800 - 500 * scale) / 2}px)`,
    );
  });

  it('when the area is narrow, should use one column centered on both axes', () => {
    mockLayout({ frame: [800, 600], stage: [384, 300] });

    const { container } = render(<MindMapView map={map} />);

    expect(transform()).toContain('translate(208px, 150px) scale(1)');
    expect(container.querySelector('svg path[marker-end]')).toBeNull();
  });

  it('when the column is taller than the area, should start at the top (with the padding) and stay centered across', () => {
    mockLayout({ frame: [800, 600], stage: [384, 2000] });

    render(<MindMapView map={map} />);

    expect(transform()).toContain('translate(208px, 32px) scale(1)');
  });

  it('when the area is 1000 px wide or more, should use the wide drawing; below that, the column', () => {
    mockLayout({ frame: [1000, 700], stage: [1310, 500] });
    const { container, unmount } = render(<MindMapView map={map} />);

    expect(container.querySelector('.grid-cols-\\[1fr_auto_1fr\\]')).not.toBeNull();

    unmount();
    vi.restoreAllMocks();
    mockLayout({ frame: [999, 700], stage: [384, 500] });

    const narrow = render(<MindMapView map={map} />);

    expect(narrow.container.querySelector('.grid-cols-\\[1fr_auto_1fr\\]')).toBeNull();
  });

  it('when the area changes size, should fit and center the map again', () => {
    const callbacks: Array<() => void> = [];

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }

        observe() {}

        disconnect() {}
      },
    );

    mockLayout({ frame: [1400, 800], stage: [1000, 400] });
    render(<MindMapView map={map} />);

    expect(transform()).toContain('translate(200px, 200px) scale(1)');

    mockLayout({ frame: [1600, 900], stage: [1000, 400] });
    act(() => callbacks.forEach((callback) => callback()));

    expect(transform()).toContain('translate(300px, 250px) scale(1)');
  });
});

describe('MindMapView PNG without background', () => {
  beforeEach(() => {
    capture.mockReset();
    capture.mockResolvedValue('UE5H');
  });

  const transparentButton = () =>
    screen.getByRole('button', { name: 'Baixar o mapa como PNG sem fundo (transparente)' });

  it('when a saver is given, should offer a second icon to download without background', () => {
    render(<MindMapView map={map} onDownloadImage={vi.fn()} />);

    const bar = screen.getByRole('toolbar');

    expect(
      within(bar).getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }),
    ).toBeInTheDocument();
    expect(transparentButton()).toHaveTextContent('');
  });

  it('when no saver is given, should not offer either download', () => {
    render(<MindMapView map={map} />);

    expect(screen.queryByRole('button', { name: /Baixar o mapa/ })).not.toBeInTheDocument();
  });

  it('when the user downloads without background, should photograph with no background and suggest a name saying so', async () => {
    const onDownloadImage = vi.fn().mockResolvedValue(undefined);

    render(<MindMapView map={map} onDownloadImage={onDownloadImage} />);
    await userEvent.click(transparentButton());

    await waitFor(() => expect(onDownloadImage).toHaveBeenCalledTimes(1));

    expect(capture).toHaveBeenCalledWith(
      screen.getByRole('group', { name: 'Mapa mental de Genética' }),
      null,
    );
    expect(onDownloadImage).toHaveBeenCalledWith({
      fileName: 'Mapa mental - Genética (sem fundo)',
      dataBase64: 'UE5H',
    });
  });

  it('when the user downloads with background, should keep the solid background and the plain name', async () => {
    const onDownloadImage = vi.fn().mockResolvedValue(undefined);

    render(<MindMapView map={map} onDownloadImage={onDownloadImage} />);
    await userEvent.click(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' }));

    await waitFor(() => expect(onDownloadImage).toHaveBeenCalledTimes(1));

    expect(typeof capture.mock.calls[0][1]).toBe('string');
    expect(onDownloadImage).toHaveBeenCalledWith({
      fileName: 'Mapa mental - Genética',
      dataBase64: 'UE5H',
    });
  });

  it('when one image is being made, should show the loading on that icon and hold the other', async () => {
    capture.mockImplementation(() => new Promise(() => undefined));

    render(<MindMapView map={map} onDownloadImage={vi.fn()} />);
    await userEvent.click(transparentButton());

    expect(await screen.findByRole('button', { name: 'Gerando imagem…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Baixar o mapa como PNG sem fundo (transparente)' }),
    ).not.toBeInTheDocument();
  });

  it('when the mouse goes over the icon, should explain it with a tooltip', async () => {
    render(<MindMapView map={map} onDownloadImage={vi.fn()} />);

    await userEvent.hover(transparentButton());

    expect(
      await screen.findByText('Baixar o mapa como PNG sem fundo (transparente)', {
        selector: '[data-slot="tooltip-content"]',
      }),
    ).toBeInTheDocument();
  });

  it('when the transparent capture fails, should report the error and free both icons', async () => {
    capture.mockRejectedValue(new Error('Falha ao desenhar.'));

    const onDownloadError = vi.fn();

    render(<MindMapView map={map} onDownloadImage={vi.fn()} onDownloadError={onDownloadError} />);
    await userEvent.click(transparentButton());

    await waitFor(() => expect(onDownloadError).toHaveBeenCalledWith('Falha ao desenhar.'));

    expect(await screen.findByRole('button', { name: /sem fundo/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Baixar o mapa como PNG com fundo' })).toBeEnabled();
  });
});
