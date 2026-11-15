import { needsInitialSetup } from './first-run';

describe('needsInitialSetup', () => {
  it('when it is the first run and there is no gemini key, should open the setup', () => {
    expect(needsInitialSetup(true, false)).toBe(true);
  });

  it('when it is the first run but the key was imported, should not open the setup', () => {
    expect(needsInitialSetup(true, true)).toBe(false);
  });

  it('when settings were already saved, should not open the setup even without a key', () => {
    expect(needsInitialSetup(false, false)).toBe(false);
  });
});
