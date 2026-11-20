import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toPng = vi.hoisted(() => vi.fn());

vi.mock('html-to-image', () => ({ toPng }));

import { captureInfographicPng, IMAGE_PIXEL_RATIO } from './infographic-image';

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

describe('captureInfographicPng', () => {
  it('when capturing, should answer the PNG in base64 without the data prefix', async () => {
    await expect(captureInfographicPng(stageOf(800, 500), false)).resolves.toBe('QUJD');
  });

  it('when capturing with background, should photograph the whole frame at 2x and keep its own background', async () => {
    const stage = stageOf(800, 500);

    await captureInfographicPng(stage, false);

    expect(toPng).toHaveBeenCalledWith(
      stage,
      expect.objectContaining({ width: 800, height: 500, pixelRatio: IMAGE_PIXEL_RATIO }),
    );
    expect(toPng.mock.calls[0][1].style).toBeUndefined();
  });

  it('when capturing without background, should clear the frame background and border', async () => {
    await captureInfographicPng(stageOf(800, 500), true);

    expect(toPng.mock.calls[0][1].style).toEqual({ background: 'transparent', border: 'none' });
  });

  it('when the capture fails, should reject so the screen can tell the user', async () => {
    toPng.mockRejectedValue(new Error('falhou'));

    await expect(captureInfographicPng(stageOf(10, 10), false)).rejects.toThrow('falhou');
  });

  describe('svg paint', () => {
    function stageWithPiece() {
      const stage = stageOf(800, 500);

      stage.innerHTML =
        '<svg><rect class="fill-x" /><path class="stroke-x" /></svg><div class="outside"></div>';

      return stage;
    }

    it('when capturing, should pin the computed fill and stroke on svg shapes (the library loses CSS classes there)', async () => {
      const stage = stageWithPiece();
      const seen: Array<{ fill: string; stroke: string }> = [];

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        fill: 'rgb(6, 182, 212)',
        stroke: 'rgb(1, 2, 3)',
      } as CSSStyleDeclaration);
      toPng.mockImplementation(() => {
        stage.querySelectorAll<SVGElement>('svg *').forEach((element) => {
          seen.push({ fill: element.style.fill, stroke: element.style.stroke });
        });

        return Promise.resolve('data:image/png;base64,QUJD');
      });

      await captureInfographicPng(stage, false);

      expect(seen).toHaveLength(2);
      expect(seen.every((paint) => paint.fill !== '' && paint.stroke !== '')).toBe(true);
    });

    it('when the capture ends, should put the original svg styles back', async () => {
      const stage = stageWithPiece();
      const rect = stage.querySelector<SVGElement>('rect') as SVGElement;

      rect.style.fill = 'red';
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        fill: 'rgb(6, 182, 212)',
        stroke: 'rgb(1, 2, 3)',
      } as CSSStyleDeclaration);

      await captureInfographicPng(stage, false);

      expect(rect.style.fill).toBe('red');
      expect(rect.style.stroke).toBe('');
    });

    it('when the capture fails, should still put the svg styles back', async () => {
      const stage = stageWithPiece();
      const path = stage.querySelector<SVGElement>('path') as SVGElement;

      toPng.mockRejectedValue(new Error('falhou'));
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        fill: 'rgb(6, 182, 212)',
        stroke: 'rgb(1, 2, 3)',
      } as CSSStyleDeclaration);

      await expect(captureInfographicPng(stage, false)).rejects.toThrow('falhou');

      expect(path.style.fill).toBe('');
    });
  });
});
