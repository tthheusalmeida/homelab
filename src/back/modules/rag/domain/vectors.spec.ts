import { fromBase64, fuseRankings, normalize, similarity, toBase64 } from './vectors';

describe('normalize and similarity', () => {
  it('when a vector is normalized, should have length 1', () => {
    const vector = normalize([3, 4]);

    expect(similarity(vector, vector)).toBeCloseTo(1);
  });

  it('when two vectors point the same way, should be 1, and 0 when they are orthogonal', () => {
    expect(similarity(normalize([1, 2]), normalize([2, 4]))).toBeCloseTo(1);
    expect(similarity(normalize([1, 0]), normalize([0, 1]))).toBeCloseTo(0);
  });

  it('when the vector is all zeros, should not divide by zero', () => {
    expect(Array.from(normalize([0, 0]))).toEqual([0, 0]);
  });
});

describe('base64', () => {
  it('when a vector is saved and read back, should be the same', () => {
    const vector = normalize([0.1, -0.5, 2]);

    expect(Array.from(fromBase64(toBase64(vector)))).toEqual(Array.from(vector));
  });
});

describe('fuseRankings', () => {
  it('when an item is high in both lists, should beat items that are in only one', () => {
    const scores = fuseRankings(['a', 'b', 'c'], ['b', 'd']);
    const order = [...scores.entries()].sort((x, y) => y[1] - x[1]).map(([id]) => id);

    expect(order[0]).toBe('b');
    expect(order).toEqual(expect.arrayContaining(['a', 'c', 'd']));
  });

  it('when there is a single list, should keep its order', () => {
    const scores = fuseRankings(['x', 'y', 'z']);

    expect(scores.get('x')!).toBeGreaterThan(scores.get('y')!);
    expect(scores.get('y')!).toBeGreaterThan(scores.get('z')!);
  });
});
