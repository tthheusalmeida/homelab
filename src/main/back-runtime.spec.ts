import { BackRuntime } from './back-runtime';

describe('BackRuntime', () => {
  it('when the back build does not exist, should fail asking to build the back', () => {
    expect(() => new BackRuntime('/x/back', () => false)).toThrow(/npm run build:back/);
  });
});
