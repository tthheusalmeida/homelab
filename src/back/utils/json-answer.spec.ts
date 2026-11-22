import { parseJsonObject, repairJson } from './json-answer';

describe('parseJsonObject', () => {
  it('when the answer is a plain JSON object, should read it', () => {
    expect(parseJsonObject('{"a": 1, "b": ["x", "y"]}')).toEqual({ a: 1, b: ['x', 'y'] });
  });

  it('when the JSON comes inside a code fence, should read it', () => {
    expect(parseJsonObject('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it('when there is text before and after the JSON, should read only the object', () => {
    expect(parseJsonObject('Claro! Aqui está:\n{"a": 1}\nEspero ter ajudado.')).toEqual({ a: 1 });
  });

  it('when a stray brace shows up in the text before the JSON, should skip it', () => {
    expect(parseJsonObject('Use {assim} o formato: {"a": 1}')).toEqual({ a: 1 });
  });

  it('when an unclosed brace comes before the JSON, should still find the real object', () => {
    expect(parseJsonObject('Resposta { incompleta... depois: {"a": 1}')).toEqual({ a: 1 });
  });

  it('when braces appear inside a text value, should not be confused by them', () => {
    expect(parseJsonObject('{"a": "texto com } e { dentro", "b": 2}')).toEqual({
      a: 'texto com } e { dentro',
      b: 2,
    });
  });

  it('when there is a trailing comma, should read it', () => {
    expect(parseJsonObject('{"a": [1, 2, ], "b": {"c": 1,},}')).toEqual({ a: [1, 2], b: { c: 1 } });
  });

  it('when there are comments, should ignore them', () => {
    expect(parseJsonObject('{\n  // comentário\n  "a": 1, /* outro */ "b": 2\n}')).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('when a text value has a raw line break or tab, should keep it as text', () => {
    expect(parseJsonObject('{"a": "linha 1\nlinha 2\tfim"}')).toEqual({
      a: 'linha 1\nlinha 2\tfim',
    });
  });

  it('when a slash appears inside a text value, should not treat it as a comment', () => {
    expect(parseJsonObject('{"url": "http://exemplo.com/a", "b": "// não é comentário"}')).toEqual({
      url: 'http://exemplo.com/a',
      b: '// não é comentário',
    });
  });

  describe('when the answer was cut at the end', () => {
    it('should close an unfinished text value', () => {
      expect(parseJsonObject('{"a": 1, "b": "meio da fra')).toEqual({ a: 1, b: 'meio da fra' });
    });

    it('should drop a key that has no value yet', () => {
      expect(parseJsonObject('{"a": 1, "b')).toEqual({ a: 1 });
      expect(parseJsonObject('{"a": 1, "b"')).toEqual({ a: 1 });
    });

    it('should give null to a key whose value did not arrive', () => {
      expect(parseJsonObject('{"a": 1, "b":')).toEqual({ a: 1, b: null });
    });

    it('should close nested lists and objects, keeping what came whole', () => {
      expect(
        parseJsonObject(
          '{"sections": [{"title": "A", "items": [{"x": 1}, {"x": 2}]}, {"title": "B", "ite',
        ),
      ).toEqual({
        sections: [{ title: 'A', items: [{ x: 1 }, { x: 2 }] }, { title: 'B' }],
      });
    });

    it('should drop a trailing comma before closing', () => {
      expect(parseJsonObject('{"a": [1, 2,')).toEqual({ a: [1, 2] });
    });

    it('should not keep a half escape at the end of a text', () => {
      expect(parseJsonObject('{"a": "termina com barra\\')).toEqual({ a: 'termina com barra' });
    });

    it('should read a cut that happens inside a fenced block', () => {
      expect(parseJsonObject('```json\n{"a": 1, "b": [1, 2')).toEqual({ a: 1, b: [1, 2] });
    });
  });

  describe('when there is nothing usable', () => {
    it.each([
      ['empty text', ''],
      ['no braces', 'não tem json nenhum'],
      ['an empty object', '{}'],
      ['only a list', '[1, 2, 3]'],
      ['broken beyond repair', '{ isso: nao e json }'],
    ])('should return null (%s)', (_label, answer) => {
      expect(parseJsonObject(answer)).toBeNull();
    });
  });
});

describe('repairJson', () => {
  it('when the JSON is already fine, should leave it equivalent', () => {
    const fine = '{"a": [1, {"b": "c"}], "d": null}';

    expect(JSON.parse(repairJson(fine))).toEqual(JSON.parse(fine));
  });
});
