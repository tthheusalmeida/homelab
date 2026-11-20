import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import type { TimedExcerpt } from '#shared/transcript';
import { AppearanceContext, type AppearanceApi } from '#hooks/use-appearance';

import { TranscriptView } from './TranscriptView';
import { tooltipTextOf } from '#test/tooltip';

const excerpts: TimedExcerpt[] = [0, 60, 120, 180, 240, 300].map((seconds, index) => ({
  seconds,
  text: `Trecho número ${index + 1} com bastante texto falado para o teste`,
}));

const HEIGHT = 300;
const SCROLL_HEIGHT = 2000;

/** Faz cada trecho ocupar 300 px empilhados e a página rolar `y` px. */
function scrollTo(y: number) {
  Object.defineProperty(document.documentElement, 'scrollTop', { configurable: true, value: y });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: SCROLL_HEIGHT,
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const all = [...document.querySelectorAll('[data-excerpt]')];
    const index = all.indexOf(this);
    const top = index === -1 ? 0 : index * HEIGHT - y;

    return { top, height: index === -1 ? 0 : HEIGHT } as DOMRect;
  });
  act(() => {
    document.dispatchEvent(new Event('scroll'));
  });
}

const withPreferences = (preview: boolean, children: React.ReactNode, progress = true) => {
  const api: AppearanceApi = {
    appearance: { ...DEFAULT_APPEARANCE, transcript: { preview, progress } },
    update: vi.fn(),
    updateReading: vi.fn(),
    reset: vi.fn(),
    resetReading: vi.fn(),
    updateTranscript: vi.fn(),
    resetTranscript: vi.fn(),
    updateSummary: vi.fn(),
    resetSummary: vi.fn(),
  };

  return <AppearanceContext.Provider value={api}>{children}</AppearanceContext.Provider>;
};

const rail = () => screen.getByRole('complementary', { name: 'Trechos da transcrição' });
const railItem = (clock: string) =>
  within(rail()).getByRole('button', { name: `Ir para ${clock}` });

describe('TranscriptView', () => {
  beforeEach(() => {
    scrollTo(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('when rendered, should show every excerpt with the full text', () => {
    render(<TranscriptView excerpts={excerpts} />);

    for (const [index, excerpt] of excerpts.entries()) {
      const section = screen.getByRole('region', {
        name: `Trecho de ${index === 0 ? '0:00' : `${index}:00`}`,
      });

      expect(within(section).getByText(excerpt.text)).toBeInTheDocument();
    }
  });

  it('when the source is YouTube, should open the video at the excerpt time from the chip', async () => {
    render(<TranscriptView excerpts={excerpts} sourceUrl="https://www.youtube.com/watch?v=abc" />);

    const chip = within(screen.getByRole('region', { name: 'Trecho de 2:00' })).getByRole('link');

    expect(chip).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc&t=120s');
    expect(await tooltipTextOf(chip)).toBe('Abrir o vídeo neste momento');
  });

  it('when the platform has no timed link, should open just the video and say so', async () => {
    render(<TranscriptView excerpts={excerpts} sourceUrl="https://outro.test/v/1" />);

    const chip = within(screen.getByRole('region', { name: 'Trecho de 2:00' })).getByRole('link');

    expect(chip).toHaveAttribute('href', 'https://outro.test/v/1');
    expect(await tooltipTextOf(chip)).toMatch(/não abre no momento exato/);
  });

  it('when there is no source link, should show the times as plain text', () => {
    render(<TranscriptView excerpts={excerpts} />);

    expect(
      within(screen.getByRole('region', { name: 'Trecho de 2:00' })).queryByRole('link'),
    ).not.toBeInTheDocument();
  });

  it('when opened at the top, should point to the first excerpt as the current one', () => {
    render(<TranscriptView excerpts={excerpts} />);

    expect(railItem('0:00')).toHaveAttribute('aria-current', 'step');
    expect(railItem('1:00')).not.toHaveAttribute('aria-current');
  });

  it('when the reading moves forward, should make the matching excerpt current and mark the ones before as read', async () => {
    render(<TranscriptView excerpts={excerpts} />);

    scrollTo(616);

    await waitFor(() => expect(railItem('3:00')).toHaveAttribute('aria-current', 'step'));
    expect(screen.getByRole('region', { name: 'Trecho de 2:00' })).toHaveAttribute(
      'data-state',
      'played',
    );
    expect(screen.getByRole('region', { name: 'Trecho de 3:00' })).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(screen.getByRole('region', { name: 'Trecho de 4:00' })).toHaveAttribute(
      'data-state',
      'idle',
    );
  });

  it('when the reading is inside an excerpt, should fill its bar by how much was read', async () => {
    render(<TranscriptView excerpts={excerpts} />);

    scrollTo(616);

    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Trecho de 3:00' }).style.getPropertyValue('--f'),
      ).toBe('0.380'),
    );
    expect(
      screen.getByRole('region', { name: 'Trecho de 4:00' }).style.getPropertyValue('--f'),
    ).toBe('0.000');
  });

  it('when an excerpt is shown, should have one time only, with a start hexagon and a span on the progress bar', () => {
    render(<TranscriptView excerpts={excerpts} />);

    const first = screen.getByRole('region', { name: 'Trecho de 3:00' });

    expect(first.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(first.querySelector('[data-slot="excerpt-start"]')).not.toBeNull();
    expect(first.querySelector('[data-slot="excerpt-span"]')).not.toBeNull();
    expect(first.querySelector('[data-slot="excerpt-elapsed"]')).not.toBeNull();
    expect(first.querySelector('[data-slot="excerpt-end"]')).toBeNull();
    expect(first.textContent).not.toMatch(/até/);
  });

  it('when the progress option is off, should hide the progress bar but keep the time', () => {
    render(withPreferences(true, <TranscriptView excerpts={excerpts} />, false));

    const first = screen.getByRole('region', { name: 'Trecho de 3:00' });

    expect(first.querySelector('[role="progressbar"]')).toBeNull();
    expect(first).toHaveTextContent('3:00');
  });

  it('when the reading moves on, should color finished links, the current one and the rest differently', async () => {
    render(<TranscriptView excerpts={excerpts} />);

    scrollTo(SCROLL_HEIGHT - window.innerHeight);

    await waitFor(() => expect(railItem('5:00')).toHaveAttribute('aria-current', 'step'));
    const links = [...rail().querySelectorAll('[data-slot="transcript-rail-link"]')];

    expect(links).toHaveLength(excerpts.length - 1);
    expect(links.every((link) => link.getAttribute('data-state') === 'done')).toBe(true);
  });

  it('when at the start, should have one link reading and the others idle, none after the last hexagon', () => {
    render(<TranscriptView excerpts={excerpts} />);

    const links = [...rail().querySelectorAll('[data-slot="transcript-rail-link"]')];

    expect(links[0]).toHaveAttribute('data-state', 'reading');
    expect(links.slice(1).every((link) => link.getAttribute('data-state') === 'idle')).toBe(true);
  });

  it('when rendered, should title the rail as the timeline', () => {
    render(<TranscriptView excerpts={excerpts} />);

    expect(within(rail()).getByRole('heading', { name: 'Linha do tempo' })).toBeInTheDocument();
  });

  it('when an excerpt is shown, should highlight its background on hover', () => {
    render(<TranscriptView excerpts={excerpts} />);

    expect(document.querySelector('[data-excerpt]')).toHaveClass('hover:bg-foreground/8');
  });

  it('when a rail slot is given, should render the rail inside it instead of beside the text', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);

    render(<TranscriptView excerpts={excerpts} railSlot={slot} />);

    expect(slot.querySelector('[data-slot="transcript-rail"]')).not.toBeNull();
    expect(slot.querySelector('[data-slot="transcript-rail"]')).toHaveClass('top-4');
    slot.remove();
  });

  it('when the rail slot is not ready yet, should wait without rendering the rail', () => {
    render(<TranscriptView excerpts={excerpts} railSlot={null} />);

    expect(document.querySelector('[data-slot="transcript-rail"]')).toBeNull();
  });

  it('when scrolled to the end, should mark everything as read and keep the last as current', async () => {
    render(<TranscriptView excerpts={excerpts} />);

    scrollTo(SCROLL_HEIGHT - window.innerHeight);

    await waitFor(() => expect(railItem('5:00')).toHaveAttribute('aria-current', 'step'));
    expect(screen.getByRole('region', { name: 'Trecho de 4:00' })).toHaveAttribute(
      'data-state',
      'played',
    );
    expect((rail().querySelector('div') as HTMLElement | null)?.style.getPropertyValue('--g')).toBe(
      '1.000',
    );
  });

  it('when a hexagon of the rail is clicked, should scroll to that excerpt', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });
    render(<TranscriptView excerpts={excerpts} />);

    await userEvent.setup().click(railItem('4:00'));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      screen.getByRole('region', { name: 'Trecho de 4:00' }),
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('when the preference is on (default), should show the start of each excerpt in the rail', () => {
    render(<TranscriptView excerpts={excerpts} />);

    expect(within(rail()).getAllByText('Trecho número 1 com bastante…')).toHaveLength(1);
  });

  it('when the preference is off, should show only the times in the rail', () => {
    render(withPreferences(false, <TranscriptView excerpts={excerpts} />));

    expect(rail().querySelector('[data-slot=transcript-rail-preview]')).toBeNull();
    expect(railItem('2:00')).toBeInTheDocument();
  });
});
