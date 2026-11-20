import { describe, expect, it } from 'vitest';

import { buildImagePdf, bytesToBase64, textToBase64 } from './pdf-image';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
const size = { imageWidth: 2400, imageHeight: 6000, pageWidth: 1200, pageHeight: 3000 };
const asText = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

describe('buildImagePdf', () => {
  it('when building, should start as a PDF and end with the end-of-file marker', () => {
    const text = asText(buildImagePdf(jpeg, size));

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('when building, should make one page sized in points (96 dpi to 72 dpi)', () => {
    const text = asText(buildImagePdf(jpeg, size));

    expect(text).toContain('/MediaBox [0 0 900 2250]');
    expect(text).toContain('/Count 1');
    expect(text).toContain('q 900 0 0 2250 0 0 cm /Im0 Do Q');
  });

  it('when building, should embed the JPEG bytes untouched with its pixel size', () => {
    const bytes = buildImagePdf(jpeg, size);
    const text = asText(bytes);

    expect(text).toContain('/Width 2400 /Height 6000');
    expect(text).toContain('/Filter /DCTDecode /Length 9');

    const at = text.indexOf('stream\n\xff\xd8') + 'stream\n'.length;

    expect([...bytes.subarray(at, at + jpeg.length)]).toEqual([...jpeg]);
  });

  it('when building, should point every xref entry at the start of its object', () => {
    const bytes = buildImagePdf(jpeg, size);
    const text = asText(bytes);
    const table = text.slice(text.indexOf('xref\n') + 5).split('\n');
    const entries = table.slice(2, 7);

    entries.forEach((entry, index) => {
      const offset = Number(entry.slice(0, 10));

      expect(text.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true);
    });

    const startxref = Number(text.match(/startxref\n(\d+)/)?.[1]);

    expect(text.slice(startxref).startsWith('xref')).toBe(true);
  });
});

describe('base64 helpers', () => {
  it('when encoding bytes, should match the standard base64', () => {
    expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=');
  });

  it('when encoding a large array, should not overflow the stack', () => {
    expect(bytesToBase64(new Uint8Array(300_000)).length).toBe(400_000);
  });

  it('when encoding text with accents, should use UTF-8', () => {
    expect(atob(textToBase64('Infográfico'))).toBe('Infogr\xc3\xa1fico');
  });
});
