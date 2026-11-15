import { fail, ok } from './result';

describe('IpcResult helpers', () => {
  it('when wrapping data, should return an ok envelope', () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });

  it('when wrapping an error, should return a failed envelope', () => {
    expect(fail({ code: 'INTERNAL', message: 'x' })).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'x' },
    });
  });
});
