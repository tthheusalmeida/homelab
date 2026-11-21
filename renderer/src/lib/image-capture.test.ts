import { afterEach, describe, expect, it } from 'vitest';

import { DATA_URL_PREFIX, IMAGE_PIXEL_RATIO, pinSvgPaint } from './image-capture';

afterEach(() => {
  document.body.innerHTML = '';
});

const stage = () => {
  const host = document.createElement('div');

  host.innerHTML = '<svg><path class="tone" /><circle /></svg>';
  document.body.append(host);

  return host;
};

describe('image-capture', () => {
  it('when the prefix is removed, should leave only the base64 of a PNG data url', () => {
    expect('data:image/png;base64,AAAA'.replace(DATA_URL_PREFIX, '')).toBe('AAAA');
    expect(IMAGE_PIXEL_RATIO).toBe(2);
  });

  it('when pinning the paint, should write the computed fill and stroke on every svg child', () => {
    const host = stage();
    const path = host.querySelector('path') as SVGElement;
    const style = document.createElement('style');

    style.textContent = '.tone { fill: rgb(1, 2, 3); stroke: rgb(4, 5, 6); }';
    document.head.append(style);

    pinSvgPaint(host);

    expect(path.style.fill).toBe('rgb(1, 2, 3)');
    expect(path.style.stroke).toBe('rgb(4, 5, 6)');

    style.remove();
  });

  it('when the returned undo runs, should put the previous inline paint back', () => {
    const host = stage();
    const circle = host.querySelector('circle') as SVGElement;

    circle.style.fill = 'red';

    const undo = pinSvgPaint(host);

    undo();

    expect(circle.style.fill).toBe('red');
  });

  it('when there is no svg in the stage, should do nothing and still return an undo', () => {
    const host = document.createElement('div');

    expect(() => pinSvgPaint(host)()).not.toThrow();
  });
});
