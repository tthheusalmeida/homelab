import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toPng = vi.hoisted(() => vi.fn());

vi.mock('html-to-image', () => ({ toPng }));

import {
  captureMindMapPng,
  IMAGE_PADDING,
  IMAGE_PIXEL_RATIO,
  mindMapImageName,
} from './mind-map-image';

function stageOf(width: number, height: number) {
  const stage = document.createElement('div');

  Object.defineProperty(stage, 'offsetWidth', { value: width });
  Object.defineProperty(stage, 'offsetHeight', { value: height });

  return stage;
}

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  toPng.mockReset();
  toPng.mockResolvedValue('data:image/png;base64,QUJD');
});

describe('captureMindMapPng', () => {
  it('when capturing, should answer the PNG in base64 without the data prefix', async () => {
    await expect(captureMindMapPng(stageOf(800, 500), 'rgb(250, 250, 250)')).resolves.toBe('QUJD');
  });

  it('when capturing, should photograph the whole map at its natural size with padding around it', async () => {
    const stage = stageOf(800, 500);

    await captureMindMapPng(stage, 'rgb(250, 250, 250)');

    expect(toPng).toHaveBeenCalledWith(
      stage,
      expect.objectContaining({
        width: 800 + IMAGE_PADDING * 2,
        height: 500 + IMAGE_PADDING * 2,
        pixelRatio: IMAGE_PIXEL_RATIO,
        backgroundColor: 'rgb(250, 250, 250)',
      }),
    );
  });

  it('when the map is panned or zoomed on screen, should still capture it without that transform', async () => {
    await captureMindMapPng(stageOf(800, 500), 'white');

    const { style } = toPng.mock.calls[0][1];

    expect(style.transform).toBe(`translate(${IMAGE_PADDING}px, ${IMAGE_PADDING}px) scale(1)`);
    expect(style.width).toBe('800px');
  });

  it('when the capture fails, should reject so the screen can tell the user', async () => {
    toPng.mockRejectedValue(new Error('falhou'));

    await expect(captureMindMapPng(stageOf(10, 10), 'white')).rejects.toThrow('falhou');
  });
});

describe('captureMindMapPng svg paint', () => {
  function stageWithLogo() {
    const stage = stageOf(800, 500);

    stage.innerHTML =
      '<svg><path class="fill-brand" /><path class="fill-foreground" style="fill: red" /></svg>';

    return stage;
  }

  it('when capturing, should pin the computed fill of each svg shape during the photo', async () => {
    const stage = stageWithLogo();
    const paths = stage.querySelectorAll('path');
    const original = window.getComputedStyle.bind(window);

    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = original(element);

      return {
        ...style,
        fill: (element as Element).classList.contains('fill-brand')
          ? 'rgb(6, 182, 212)'
          : 'rgb(30, 30, 30)',
      } as CSSStyleDeclaration;
    });

    let during: string[] = [];

    toPng.mockImplementation(async () => {
      during = [...paths].map((path) => path.style.fill);

      return 'data:image/png;base64,QUJD';
    });

    await captureMindMapPng(stage, 'white');

    expect(during).toEqual(['rgb(6, 182, 212)', 'rgb(30, 30, 30)']);
  });

  it('when the photo is done, should put the original fills back', async () => {
    const stage = stageWithLogo();
    const [first, second] = stage.querySelectorAll('path');

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fill: 'rgb(1, 2, 3)',
    } as CSSStyleDeclaration);

    await captureMindMapPng(stage, 'white');

    expect(first.style.fill).toBe('');
    expect(second.style.fill).toBe('red');
  });

  it('when the photo fails, should still put the original fills back', async () => {
    const stage = stageWithLogo();
    const [first] = stage.querySelectorAll('path');

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fill: 'rgb(1, 2, 3)',
    } as CSSStyleDeclaration);
    toPng.mockRejectedValue(new Error('falhou'));

    await expect(captureMindMapPng(stage, 'white')).rejects.toThrow('falhou');
    expect(first.style.fill).toBe('');
  });
});

describe('captureMindMapPng without background', () => {
  it('when the background is null, should ask for a transparent PNG (no background color)', async () => {
    await captureMindMapPng(stageOf(800, 500), null);

    const options = toPng.mock.calls[0][1];

    expect(options).not.toHaveProperty('backgroundColor');
    expect(options).toMatchObject({
      width: 800 + IMAGE_PADDING * 2,
      pixelRatio: IMAGE_PIXEL_RATIO,
    });
  });

  it('when the background is null, should still answer the PNG in base64', async () => {
    await expect(captureMindMapPng(stageOf(800, 500), null)).resolves.toBe('QUJD');
  });
});

describe('mindMapImageName', () => {
  it('when the title is normal, should prefix it with Mapa mental', () => {
    expect(mindMapImageName('Redes de computadores')).toBe('Mapa mental - Redes de computadores');
  });

  it('when the title has extra spaces or is very long, should tidy and cut it', () => {
    expect(mindMapImageName('  Redes   de  computadores ')).toBe(
      'Mapa mental - Redes de computadores',
    );
    expect(mindMapImageName('a'.repeat(200)).length).toBe('Mapa mental - '.length + 80);
  });

  it('when the image has no background, should say so in the name', () => {
    expect(mindMapImageName('Redes', true)).toBe('Mapa mental - Redes (sem fundo)');
    expect(mindMapImageName('  ', true)).toBe('Mapa mental (sem fundo)');
  });

  it('when the title is empty, should be just Mapa mental', () => {
    expect(mindMapImageName('   ')).toBe('Mapa mental');
  });
});
