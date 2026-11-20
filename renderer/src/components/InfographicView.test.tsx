import { createRef } from 'react';

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
      expect(document.querySelectorAll('[data-step-arrow]')).toHaveLength(3);
    });

    it('when drawing the arrow between steps, should center it in the gap and drop the hexagon', () => {
      const { container } = render(<InfographicView data={one('steps')} />);
      const arrow = container.querySelector('[data-step-arrow]') as HTMLElement;

      // ocupa o vão inteiro (gap-10 = w-10) na altura da peça, com o ícone no meio
      expect(arrow.className).toContain('-right-10');
      expect(arrow.className).toContain('w-10');
      expect(arrow.className).toContain('inset-y-0');
      expect(arrow.className).toContain('items-center');
      expect(arrow.className).toContain('justify-center');
      expect(arrow.className).not.toContain('clip-path');
      expect(arrow.querySelector('svg')?.getAttribute('stroke-width')).toBe('3.5');
      expect(arrow.textContent).toBe('');
    });

    it('when listing the tips, should give each one 8px of inner spacing', () => {
      render(<InfographicView data={one('steps')} />);

      expect(screen.getByText('Dica dois').closest('li')?.className).toContain('p-2');
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
    it('when rendering, should not draw a divider line under the title', () => {
      const { container } = render(<InfographicView data={one('myths')} />);
      const section = container.querySelector('section') as HTMLElement;

      // só o divisor da própria seção (acima do "Parte N de M"); nenhum abaixo do título
      expect(section.querySelectorAll('.h-px')).toHaveLength(1);
    });

    it('when rendering, should show every myth with its truth', () => {
      render(<InfographicView data={one('myths')} />);

      expect(screen.getAllByText('Título 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Texto 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mito').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Verdade').length).toBeGreaterThan(0);
    });

    it('when painting the pairs, should make the myth red and the truth green, never the accent color', () => {
      const { container } = render(<InfographicView data={one('myths')} />);
      const myths = container.querySelectorAll('[data-myth="mito"]');
      const truths = container.querySelectorAll('[data-myth="verdade"]');

      expect(myths.length).toBeGreaterThan(0);
      expect(truths).toHaveLength(myths.length);

      for (const myth of myths) {
        expect(myth.className).toContain('destructive');
        expect(myth.className).not.toMatch(/primary|brand/);
      }

      for (const truth of truths) {
        expect(truth.className).toContain('emerald');
        expect(truth.className).not.toMatch(/primary|brand/);
      }
    });
  });

  describe('closing', () => {
    it('when there are takeaways, should leave a gap between the last divider and the footer', () => {
      const { container } = render(<InfographicView data={story([SAMPLES.steps])} />);
      const rules = container.querySelectorAll('.h-px');
      const last = rules[rules.length - 1] as HTMLElement;

      expect(last.className).toContain('mb-6');
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

    it('when drawing the arrows, should draw a true quarter circle (a square with one fully rounded corner) next to a straight stretch', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);

      for (const arrow of container.querySelectorAll('[data-arrow]')) {
        const part = (name: string) => arrow.querySelector(`[data-part="${name}"]`) as HTMLElement;

        expect(part('arc').className).toMatch(/rounded-(tr|br|bl|tl)-full/);
        // quadrado com a altura da faixa: o raio é metade do lado, então o arco é circular
        expect(part('arc').className).toContain('aspect-square');
        expect(part('arc').className).toContain('h-full');
        expect(part('line').className).toContain('flex-1');
        expect(part('band').className).toContain('flex');
      }
    });

    it('when drawing the arrows, should start 8px from the source card and stop at the base of the head', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);
      const band = (id: string) =>
        (container.querySelector(`[data-arrow="${id}"] [data-part="band"]`) as HTMLElement)
          .className;

      expect(band('tr')).toContain('-left-4'); // começa a 8 px da borda do cartão 1
      expect(band('tr')).toContain('-bottom-[5px]'); // termina na base da ponta, antes do cartão 2
      expect(band('br')).toContain('-top-4');
      expect(band('bl')).toContain('-right-4');
      expect(band('tl')).toContain('-bottom-4');
    });

    it('when drawing the arrows, should end each one with a triangle 8px from the edge of the next step', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);
      const head = (id: string) =>
        (container.querySelector(`[data-arrow="${id}"] [data-part="head"]`) as HTMLElement)
          .className;

      expect(head('tr')).toContain('-bottom-4'); // entra pelo topo do 2, apontando para baixo
      expect(head('tr')).toContain('border-t-[11px]');
      expect(head('br')).toContain('-left-4'); // entra pela direita do 3, apontando para a esquerda
      expect(head('br')).toContain('border-r-[11px]');
      expect(head('bl')).toContain('-top-4'); // entra por baixo do 4, apontando para cima
      expect(head('bl')).toContain('border-b-[11px]');
      expect(head('tl')).toContain('-right-4'); // entra pela esquerda do 1, apontando para a direita
      expect(head('tl')).toContain('border-l-[11px]');
    });

    it('when drawing the steps, should show a numbered badge on each card', () => {
      const { container } = render(<InfographicView data={one('cycle')} />);
      const cards = Array.from(container.querySelectorAll('h4')).map(
        (title) => title.parentElement,
      );

      expect(cards).toHaveLength(4);
      cards.forEach((card, index) => {
        expect(card?.firstElementChild?.textContent).toBe(String(index + 1));
      });
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

describe('InfographicView: troca de peças', () => {
  const buttons = () => screen.queryAllByRole('button', { name: /^Trocar a peça:/ });

  it('when no edit is asked, should never draw buttons on the pieces', () => {
    render(<InfographicView data={one('steps')} />);

    expect(buttons()).toHaveLength(0);
  });

  it('when editing, should turn the cover piece into a button that asks for its place', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('steps')} onPickPiece={onPick} />);
    await userEvent.click(buttons()[0]);

    expect(onPick).toHaveBeenCalledWith({ section: null, part: 'piece' });
  });

  it('when editing the steps, should ask for the piece of the section and of each item', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('steps')} onPickPiece={onPick} />);

    for (const button of buttons()) {
      await userEvent.click(button);
    }

    const targets = onPick.mock.calls.map(([target]) => target);

    expect(targets).toContainEqual({ section: 0, part: 'piece' });

    for (let index = 0; index < 4; index += 1) {
      expect(targets).toContainEqual({ section: 0, part: 'item', index });
    }
  });

  it('when editing the second section, should name that section in the place', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={story([SAMPLES.steps, SAMPLES.myths])} onPickPiece={onPick} />);

    for (const button of buttons()) {
      await userEvent.click(button);
    }

    const targets = onPick.mock.calls.map(([target]) => target);

    expect(targets).toContainEqual({ section: 1, part: 'item', index: 3 });
    expect(targets).toContainEqual({ section: 0, part: 'item', index: 3 });
  });

  it('when editing the comparison, should ask for each side of it', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('versus')} onPickPiece={onPick} />);

    for (const button of buttons()) {
      await userEvent.click(button);
    }

    const targets = onPick.mock.calls.map(([target]) => target);

    expect(targets).toContainEqual({ section: 0, part: 'side', index: 0 });
    expect(targets).toContainEqual({ section: 0, part: 'side', index: 1 });
  });

  it.each(INFOGRAPHIC_LAYOUT_IDS)(
    'when editing the %s layout, should make every piece of its items a button',
    (layout) => {
      const data = one(layout);

      render(<InfographicView data={data} onPickPiece={vi.fn()} />);

      // a capa mais ao menos um botão por item da seção (o comparativo tem os lados no lugar dos itens)
      const expected = layout === 'versus' ? 1 + 2 : 1 + data.sections[0].items.length;

      expect(buttons().length).toBeGreaterThanOrEqual(expected);
    },
  );

  it('when a piece is a button, should name the piece it swaps and keep it keyboard reachable', () => {
    render(<InfographicView data={one('steps')} onPickPiece={vi.fn()} />);

    const first = buttons()[0];

    expect(first).toHaveAccessibleName('Trocar a peça: Wi-Fi');
    expect(first).toHaveAttribute('type', 'button');
  });
});

describe('InfographicView: edição de textos', () => {
  const texts = () => screen.queryAllByTitle('Editar este texto');
  const clickAll = async (onPick: ReturnType<typeof vi.fn>) => {
    for (const text of texts()) {
      await userEvent.click(text);
    }

    return onPick.mock.calls.map(([target]) => target);
  };

  it('when no edit is asked, should never mark texts as editable', () => {
    render(<InfographicView data={one('steps')} />);

    expect(texts()).toHaveLength(0);
  });

  it('when editing, should make the texts of the cover and of the closing editable', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={story([SAMPLES.steps])} onPickText={onPick} />);

    const targets = await clickAll(onPick);

    expect(targets).toContainEqual({ section: null, kind: 'kicker', index: undefined });
    expect(targets).toContainEqual({ section: null, kind: 'title', index: undefined });
    expect(targets).toContainEqual({ section: null, kind: 'subtitle', index: undefined });
    expect(targets).toContainEqual({ section: null, kind: 'intro', index: undefined });
    expect(targets).toContainEqual({ section: null, kind: 'takeaway', index: 0 });
    expect(targets).toContainEqual({ section: null, kind: 'takeaway', index: 1 });
  });

  it('when editing the steps, should make the title, each item and each tip editable', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('steps')} onPickText={onPick} />);

    const targets = await clickAll(onPick);

    expect(targets).toContainEqual({ section: 0, kind: 'title', index: undefined });

    for (let index = 0; index < 4; index += 1) {
      expect(targets).toContainEqual({ section: 0, kind: 'item.title', index });
      expect(targets).toContainEqual({ section: 0, kind: 'item.text', index });
    }

    expect(targets).toContainEqual({ section: 0, kind: 'tip', index: 0 });
    expect(targets).toContainEqual({ section: 0, kind: 'tip', index: 1 });
  });

  it('when a section has a subtitle and a note, should make them editable too', async () => {
    const onPick = vi.fn();

    render(
      <InfographicView
        data={one('cycle', { subtitle: 'Um subtítulo', note: 'Uma nota' })}
        onPickText={onPick}
      />,
    );

    const targets = await clickAll(onPick);

    expect(targets).toContainEqual({ section: 0, kind: 'subtitle', index: undefined });
    expect(targets).toContainEqual({ section: 0, kind: 'note', index: undefined });
  });

  it('when editing the second section, should name that section in the place of its texts', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={story([SAMPLES.steps, SAMPLES.myths])} onPickText={onPick} />);

    const targets = await clickAll(onPick);

    expect(targets).toContainEqual({ section: 1, kind: 'item.title', index: 3 });
    expect(targets).toContainEqual({ section: 1, kind: 'title', index: undefined });
    expect(targets).toContainEqual({ section: 0, kind: 'item.title', index: 3 });
  });

  it('when editing the comparison, should make the sides and both texts of each criterion editable', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('versus')} onPickText={onPick} />);

    const targets = await clickAll(onPick);

    expect(targets).toContainEqual({ section: 0, kind: 'side.title', index: 0 });
    expect(targets).toContainEqual({ section: 0, kind: 'side.title', index: 1 });
    expect(targets).toContainEqual({ section: 0, kind: 'item.text', index: 0 });
    expect(targets).toContainEqual({ section: 0, kind: 'item.extra', index: 0 });
    expect(targets).toContainEqual({ section: 0, kind: 'item.title', index: 0 });
  });

  it('when editing the ranking, should make the measure label editable', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('ranking')} onPickText={onPick} />);

    expect(await clickAll(onPick)).toContainEqual({
      section: 0,
      kind: 'meterLabel',
      index: undefined,
    });
  });

  it.each(INFOGRAPHIC_LAYOUT_IDS)(
    'when editing the %s layout, should make its title and the title of each item editable',
    async (layout) => {
      const onPick = vi.fn();
      const data = one(layout);

      render(<InfographicView data={data} onPickText={onPick} />);

      const targets = await clickAll(onPick);
      const kinds = new Set(
        targets.filter((target) => target.section === 0).map((target) => target.kind),
      );

      expect(kinds.has('title')).toBe(true);
      expect(kinds.has('item.title') || kinds.has('item.text') || kinds.has('side.title')).toBe(
        true,
      );
    },
  );

  it('when a text is focused and Enter or Space is pressed, should ask to edit it', async () => {
    const onPick = vi.fn();

    render(<InfographicView data={one('steps')} onPickText={onPick} />);

    const first = texts()[0];

    first.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onPick).toHaveBeenCalledTimes(2);
    expect(first).toHaveAttribute('role', 'button');
    expect(first).toHaveAttribute('tabindex', '0');
  });

  it('when editing pieces and texts at the same time, should keep both working', async () => {
    const onPickPiece = vi.fn();
    const onPickText = vi.fn();

    render(
      <InfographicView data={one('steps')} onPickPiece={onPickPiece} onPickText={onPickText} />,
    );

    await userEvent.click(screen.getAllByRole('button', { name: /^Trocar a peça:/ })[0]);
    await userEvent.click(texts()[0]);

    expect(onPickPiece).toHaveBeenCalledTimes(1);
    expect(onPickText).toHaveBeenCalledTimes(1);
  });
});
