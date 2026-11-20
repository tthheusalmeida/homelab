import { createRef } from 'react';

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import type {
  LibraryInfographic,
  LibraryInfographicItem,
  LibraryInfographicSection,
} from '#shared/contracts/library';
import { INFOGRAPHIC_LAYOUT_IDS, type InfographicLayoutId } from '#shared/infographic-layouts';

import { InfographicView } from './InfographicView';
import { radialPositions } from './infographic/RadialLayout';

const item = (n: number, extra: Partial<LibraryInfographicItem> = {}): LibraryInfographicItem => ({
  piece: 'tecnologia.chip',
  title: `Título ${n}`,
  text: `Texto ${n}`,
  ...extra,
});

const items = (count: number, extra: Partial<LibraryInfographicItem> = {}) =>
  Array.from({ length: count }, (_, i) => item(i + 1, extra));

function section(
  layout: InfographicLayoutId,
  patch: Partial<LibraryInfographicSection> = {},
): LibraryInfographicSection {
  return { layout, title: `Seção ${layout}`, piece: 'tecnologia.wifi', items: items(4), ...patch };
}

function story(
  sections: LibraryInfographicSection[],
  patch: Partial<LibraryInfographic> = {},
): LibraryInfographic {
  return {
    kicker: 'Assunto · Exemplo',
    title: 'Como a internet funciona',
    subtitle: 'Um resumo em imagens',
    intro: 'A internet é uma rede de redes.',
    piece: 'tecnologia.wifi',
    sections,
    takeaways: ['Lembre um', 'Lembre dois'],
    model: 'm',
    createdAt: '2026-11-20T10:00:00.000Z',
    stale: false,
    ...patch,
  };
}

const SAMPLES: Record<InfographicLayoutId, LibraryInfographicSection> = {
  steps: section('steps', { items: items(4), tips: ['Dica um', 'Dica dois'] }),
  funnel: section('funnel', { items: items(4, { tag: '1.000' }) }),
  timeline: section('timeline', { items: items(5, { tag: '1990' }) }),
  versus: section('versus', {
    sides: [
      { piece: 'transporte.carro', title: 'Elétrico' },
      { piece: 'transporte.posto', title: 'Combustão' },
    ],
    items: [
      item(1, { extra: 'Lado B 1', winner: 'a' }),
      item(2, { extra: 'Lado B 2', winner: 'b' }),
      item(3, { extra: 'Lado B 3', winner: 'tie' }),
    ],
  }),
  numbers: section('numbers', { items: items(4, { tag: '7-9 h' }), note: 'Observação final' }),
  radial: section('radial', { items: items(6) }),
  ranking: section('ranking', {
    meterLabel: 'Intensidade',
    items: [item(1, { value: 20 }), item(2, { value: 60 }), item(3, { value: 90 })],
  }),
  cycle: section('cycle', { items: items(4), note: 'Nota do ciclo' }),
  myths: section('myths', { items: items(4) }),
  mosaic: section('mosaic', {
    items: [item(1, { tag: '50·30·20' }), item(2), item(3)],
    tips: ['Passo um', 'Passo dois'],
    note: 'Frase de destaque',
  }),
};

/** Um infográfico de uma seção só, para testar cada modelo isolado. */
const one = (layout: InfographicLayoutId, patch: Partial<LibraryInfographicSection> = {}) =>
  story([{ ...SAMPLES[layout], ...patch }], { takeaways: undefined, intro: undefined });

describe('InfographicView: a história', () => {
  it('when rendering, should show the cover with the subject, the title, the promise and the opening text', () => {
    render(<InfographicView data={story([SAMPLES.steps, SAMPLES.timeline])} />);

    expect(screen.getByText('Assunto · Exemplo')).toBeInTheDocument();
    expect(screen.getByText(/Como a internet/)).toBeInTheDocument();
    expect(screen.getByText('Um resumo em imagens')).toBeInTheDocument();
    expect(screen.getByText('A internet é uma rede de redes.')).toBeInTheDocument();
  });

  it('when there are several sections, should draw each one in its own layout and number the parts', () => {
    render(
      <InfographicView
        data={story([SAMPLES.steps, SAMPLES.versus, SAMPLES.myths, SAMPLES.cycle])}
      />,
    );

    expect(screen.getAllByRole('region')).toHaveLength(4);
    expect(screen.getByText('Parte 1 de 4')).toBeInTheDocument();
    expect(screen.getByText('Parte 4 de 4')).toBeInTheDocument();
    // sinais de cada modelo na mesma página
    expect(screen.getByText('Etapa 1')).toBeInTheDocument(); // passos
    expect(screen.getByText('VS')).toBeInTheDocument(); // comparativo
    expect(screen.getAllByText('Mito').length).toBeGreaterThan(0); // mitos
    expect(document.querySelectorAll('[data-arrow]')).toHaveLength(4); // ciclo
  });

  it('when there is only one section, should not number the parts', () => {
    render(<InfographicView data={story([SAMPLES.steps])} />);

    expect(screen.queryByText(/Parte 1 de/)).not.toBeInTheDocument();
  });

  it('when there is a closing, should show "Para lembrar" with each takeaway', () => {
    render(<InfographicView data={story([SAMPLES.steps, SAMPLES.timeline])} />);

    const closing = screen.getByText('Para lembrar').parentElement as HTMLElement;

    expect(within(closing).getByText('Lembre um')).toBeInTheDocument();
    expect(within(closing).getByText('Lembre dois')).toBeInTheDocument();
  });

  it('when there is no closing or opening, should not render those blocks', () => {
    render(
      <InfographicView
        data={story([SAMPLES.steps, SAMPLES.timeline], {
          takeaways: undefined,
          intro: undefined,
          subtitle: undefined,
          kicker: undefined,
        })}
      />,
    );

    expect(screen.queryByText('Para lembrar')).not.toBeInTheDocument();
    expect(screen.queryByText('A internet é uma rede de redes.')).not.toBeInTheDocument();
    expect(screen.queryByText('Um resumo em imagens')).not.toBeInTheDocument();
  });

  it('when the sections are drawn, should keep them in the order the story gives', () => {
    render(<InfographicView data={story([SAMPLES.timeline, SAMPLES.steps, SAMPLES.funnel])} />);

    const titles = screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));

    expect(titles).toEqual(['Seção timeline', 'Seção steps', 'Seção funnel']);
  });

  it('when a ref is given, should point to the frame that the image export photographs (cover, sections and closing)', () => {
    const ref = createRef<HTMLDivElement>();

    render(<InfographicView ref={ref} data={story([SAMPLES.steps, SAMPLES.timeline])} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.contains(screen.getByText('Dica um'))).toBe(true);
    expect(ref.current?.contains(screen.getByText('Lembre um'))).toBe(true);
  });

  it('when the AI writes HTML in a text, should show it as plain text', () => {
    const data = story([
      section('steps', {
        items: [item(1, { text: '<img src=x onerror=alert(1)>' }), item(2), item(3)],
      }),
      SAMPLES.timeline,
    ]);

    const { container } = render(<InfographicView data={data} />);

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('InfographicView: os modelos', () => {
  it.each(INFOGRAPHIC_LAYOUT_IDS)(
    'when the layout is %s, should render the section title and the text of every item',
    (layout) => {
      const data = one(layout);

      render(<InfographicView data={data} />);

      expect(screen.getByRole('region', { name: `Seção ${layout}` })).toBeInTheDocument();

      for (const entry of data.sections[0].items) {
        const matcher = layout === 'myths' ? entry.title : entry.text || entry.title;

        expect(screen.getAllByText(matcher).length).toBeGreaterThan(0);
      }
    },
  );

  it.each(INFOGRAPHIC_LAYOUT_IDS)(
    'when the layout is %s, should draw pieces as images with no scripts',
    (layout) => {
      const { container } = render(<InfographicView data={one(layout)} />);

      expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
      expect(container.querySelector('script')).toBeNull();
    },
  );

  describe('steps', () => {
    it('when there are four steps, should number them and put an arrow between each pair', () => {
      render(<InfographicView data={one('steps')} />);

      expect(screen.getByText('Etapa 1')).toBeInTheDocument();
      expect(screen.getByText('Etapa 4')).toBeInTheDocument();
      expect(screen.getAllByText('→')).toHaveLength(3);
    });

    it('when there are tips, should list them', () => {
      render(<InfographicView data={one('steps')} />);

      expect(screen.getByText('Dica dois')).toBeInTheDocument();
    });

    it('when there are no tips, should not render the tips list', () => {
      render(<InfographicView data={one('steps', { tips: undefined, items: items(3) })} />);

      expect(screen.queryByText('Dica um')).not.toBeInTheDocument();
    });

    it('when the section has no piece, should not draw a header piece', () => {
      const { container } = render(<InfographicView data={one('steps', { piece: '' })} />);

      // a capa tem uma peça; a seção sem peça só acrescenta as peças das etapas
      expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(1 + 4);
    });
  });

  describe('versus', () => {
    it('when rendering, should show both sides and the criteria with both texts', () => {
      render(<InfographicView data={one('versus')} />);

      expect(screen.getByText('Elétrico')).toBeInTheDocument();
      expect(screen.getByText('Combustão')).toBeInTheDocument();
      expect(screen.getByText('Lado B 1')).toBeInTheDocument();
      expect(screen.getByText('VS')).toBeInTheDocument();
    });

    it('when a side wins a criterion, should highlight only that cell', () => {
      const { container } = render(<InfographicView data={one('versus')} />);

      // dois vencedores (a e b); o empate não destaca ninguém
      expect(container.querySelectorAll('.border-primary')).toHaveLength(2);
    });

    it('when the sides are missing, should still render the criteria', () => {
      render(<InfographicView data={one('versus', { sides: undefined })} />);

      expect(screen.getByText('Lado B 2')).toBeInTheDocument();
    });
  });

  describe('ranking', () => {
    it('when rendering, should number the items and show the meter label and value of each', () => {
      render(<InfographicView data={one('ranking')} />);

      expect(screen.getAllByText('Intensidade')).toHaveLength(3);
      expect(screen.getByRole('meter', { name: 'Intensidade: 60%' })).toHaveAttribute(
        'aria-valuenow',
        '60',
      );
    });

    it('when there is no meter label, should say "Medida"', () => {
      render(<InfographicView data={one('ranking', { meterLabel: undefined })} />);

      expect(screen.getAllByText('Medida')).toHaveLength(3);
    });
  });

  describe('funnel', () => {
    it('when rendering, should show the stage name and number of each stage', () => {
      render(<InfographicView data={one('funnel')} />);

      expect(screen.getAllByText('1.000')).toHaveLength(4);
      expect(screen.getByText('Título 1')).toBeInTheDocument();
    });

    it('when the stages narrow, should make each one narrower than the previous', () => {
      const { container } = render(<InfographicView data={one('funnel')} />);
      const widths = Array.from(
        container.querySelectorAll<HTMLElement>('ol > li > div:first-child'),
      ).map((element) => parseFloat(element.style.width));

      expect(widths).toHaveLength(4);
      expect(widths[0]).toBe(100);
      expect([...widths].sort((a, b) => b - a)).toEqual(widths);
    });
  });

  describe('timeline', () => {
    it('when rendering, should show the date tag of each milestone', () => {
      render(<InfographicView data={one('timeline')} />);

      expect(screen.getAllByText('1990')).toHaveLength(5);
    });
  });

  describe('numbers', () => {
    it('when there is a note, should show it with the section piece', () => {
      render(<InfographicView data={one('numbers')} />);

      expect(screen.getByText('Observação final')).toBeInTheDocument();
    });

    it('when there is no note, should not render the note box', () => {
      render(<InfographicView data={one('numbers', { note: undefined })} />);

      expect(screen.queryByText('Observação final')).not.toBeInTheDocument();
    });
  });

  describe('myths', () => {
    it('when rendering, should show every myth with its truth', () => {
      render(<InfographicView data={one('myths')} />);

      expect(screen.getAllByText('Título 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Texto 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mito').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Verdade').length).toBeGreaterThan(0);
    });
  });

  describe('cycle', () => {
    it('when rendering, should show four steps, the four corner arrows and the note', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);

      expect(
        Array.from(container.querySelectorAll('[data-arrow]')).map((arrow) =>
          arrow.getAttribute('data-arrow'),
        ),
      ).toEqual(['tr', 'br', 'bl', 'tl']);
      expect(screen.getByText('Nota do ciclo')).toBeInTheDocument();
    });

    it('when placing the steps, should put them in a diamond: 1 on top, 2 right, 3 bottom, 4 left', () => {
      render(<InfographicView data={one('cycle')} />);

      const cell = (title: string) =>
        (screen.getByText(title).closest('div') as HTMLElement).className;

      expect(cell('Título 1')).toContain('@2xl:col-start-2 @2xl:row-start-1');
      expect(cell('Título 2')).toContain('@2xl:col-start-3 @2xl:row-start-2');
      expect(cell('Título 3')).toContain('@2xl:col-start-2 @2xl:row-start-3');
      expect(cell('Título 4')).toContain('@2xl:col-start-1 @2xl:row-start-2');
    });

    it('when drawing the arrows, should put each one in the corner cell between the two steps it connects', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);
      const corner = (id: string) =>
        (container.querySelector(`[data-arrow="${id}"]`) as HTMLElement).className;

      expect(corner('tr')).toContain('@2xl:col-start-3 @2xl:row-start-1'); // 1 -> 2
      expect(corner('br')).toContain('@2xl:col-start-3 @2xl:row-start-3'); // 2 -> 3
      expect(corner('bl')).toContain('@2xl:col-start-1 @2xl:row-start-3'); // 3 -> 4
      expect(corner('tl')).toContain('@2xl:col-start-1 @2xl:row-start-1'); // 4 -> 1
    });

    it('when drawing the arrows, should give each one a rounded 90 degree bend and an arrow head', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);

      for (const arrow of container.querySelectorAll('[data-arrow]')) {
        const line = arrow.children[0];
        const head = line.children[0];

        expect(line.className).toMatch(/rounded-(tr|br|bl|tl)-/);
        expect(line.className).toContain('[28px]');
        expect(head.tagName.toLowerCase()).toBe('i');
        expect(head.className).toContain('rotate-45');
      }
    });

    it('when the area is narrow, should hide the arrows (the steps become a plain list)', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);

      for (const arrow of container.querySelectorAll('[data-arrow]')) {
        expect(arrow.className).toContain('hidden');
        expect(arrow.className).toContain('@2xl:block');
      }
    });

    it('when the AI sends more than four items, should draw only four', () => {
      render(<InfographicView data={one('cycle', { items: items(6) })} />);

      expect(screen.queryByText('Título 5')).not.toBeInTheDocument();
    });

    it('when rendering, should not draw a figure in the middle of the cycle', () => {
      render(<InfographicView data={one('cycle')} />);

      expect(screen.queryByRole('img', { name: 'Ciclo', hidden: true })).not.toBeInTheDocument();
    });
  });

  describe('mosaic', () => {
    it('when rendering, should show the highlight, the number tile, the checklist and the note', () => {
      render(<InfographicView data={one('mosaic')} />);

      expect(screen.getByText('50·30·20')).toBeInTheDocument();
      expect(screen.getByText('Checklist')).toBeInTheDocument();
      expect(
        within(screen.getByText('Checklist').parentElement as HTMLElement).getByText('Passo um'),
      ).toBeInTheDocument();
      expect(screen.getByText('Frase de destaque')).toBeInTheDocument();
    });

    it('when there are no tips and no note, should render only the highlight and the blocks', () => {
      render(<InfographicView data={one('mosaic', { tips: undefined, note: undefined })} />);

      expect(screen.queryByText('Checklist')).not.toBeInTheDocument();
      expect(screen.queryByText('Frase de destaque')).not.toBeInTheDocument();
    });
  });

  describe('radial', () => {
    it('when rendering, should show every facet', () => {
      render(<InfographicView data={one('radial')} />);

      expect(screen.getAllByText('Título 6').length).toBeGreaterThan(0);
    });
  });
});

describe('radialPositions', () => {
  it('when there are six facets, should start at the top and go clockwise around the center', () => {
    const expected = [
      [50, 13],
      [81, 32],
      [81, 69],
      [50, 87],
      [19, 69],
      [19, 32],
    ];

    radialPositions(6).forEach(([x, y], index) => {
      // pode haver 1 ponto de diferença por arredondamento do cálculo com ângulos
      expect(Math.abs(x - expected[index][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(y - expected[index][1])).toBeLessThanOrEqual(1);
    });
  });

  it.each([4, 5, 6])(
    'when there are %i facets, should place all of them inside the area',
    (count) => {
      const positions = radialPositions(count);

      expect(positions).toHaveLength(count);

      for (const [x, y] of positions) {
        expect(x).toBeGreaterThan(5);
        expect(x).toBeLessThan(95);
        expect(y).toBeGreaterThan(5);
        expect(y).toBeLessThan(95);
      }
    },
  );
});
