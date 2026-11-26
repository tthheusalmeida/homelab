import type { PdfExtraction } from '../back/modules/pdf/pdf-extractor';
import { MAX_PDF_SESSIONS, PdfSessionStore } from './pdf-session.store';

const extraction: PdfExtraction = {
  sizeBytes: 1,
  pageCount: 1,
  pages: ['texto'],
  emptyPages: 0,
  ocrPages: 0,
  ocrDiscardedPages: 0,
  languages: [],
  characters: 5,
};

const session = (name: string) => ({
  filePath: `D:/${name}.pdf`,
  fileName: `${name}.pdf`,
  extraction,
});

describe('PdfSessionStore', () => {
  it('when a session is stored, should answer the same data by its token', () => {
    const store = new PdfSessionStore();

    const token = store.put(session('a'));

    expect(store.get(token)?.fileName).toBe('a.pdf');
  });

  it('when two sessions are stored, should give each one a different token', () => {
    const store = new PdfSessionStore();

    expect(store.put(session('a'))).not.toBe(store.put(session('a')));
  });

  it('when the token is unknown, should answer nothing', () => {
    expect(new PdfSessionStore().get('nada')).toBeUndefined();
  });

  it('when there are more sessions than the limit, should drop the oldest ones', () => {
    const store = new PdfSessionStore();
    const tokens = Array.from({ length: MAX_PDF_SESSIONS + 1 }, (_, i) =>
      store.put(session(`s${i}`)),
    );

    expect(store.get(tokens[0])).toBeUndefined();
    expect(store.get(tokens[MAX_PDF_SESSIONS])).toBeDefined();
  });

  it('when a session is discarded, should no longer answer it', () => {
    const store = new PdfSessionStore();
    const token = store.put(session('a'));

    store.discard(token);

    expect(store.get(token)).toBeUndefined();
  });
});
