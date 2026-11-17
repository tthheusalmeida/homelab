import { compareVersions, isNewerVersion, parseVersion } from './version';

describe('parseVersion', () => {
  it('when the text is a plain version, should read its parts', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] });
  });

  it('when the text comes from a tag with the v prefix, should ignore the prefix', () => {
    expect(parseVersion('v0.10.4')).toMatchObject({ major: 0, minor: 10, patch: 4 });
  });

  it('when the version has a prerelease, should keep its identifiers', () => {
    expect(parseVersion('1.0.0-beta.2')?.prerelease).toEqual(['beta', '2']);
  });

  it('when the text is not a version, should answer null', () => {
    expect(parseVersion('components-v1')).toBeNull();
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });
});

describe('compareVersions', () => {
  const compare = (first: string, second: string) =>
    compareVersions(parseVersion(first)!, parseVersion(second)!);

  it('when the minor differs, should order by it numerically (0.10.0 > 0.9.0)', () => {
    expect(compare('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(compare('0.9.0', '0.10.0')).toBeLessThan(0);
  });

  it('when the versions are equal, should answer 0', () => {
    expect(compare('1.2.3', 'v1.2.3')).toBe(0);
  });

  it('when one is a prerelease of the other, should rank the final version higher', () => {
    expect(compare('1.0.0', '1.0.0-rc.1')).toBeGreaterThan(0);
    expect(compare('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
    expect(compare('1.0.0-beta.2', '1.0.0-beta.10')).toBeLessThan(0);
  });
});

describe('isNewerVersion', () => {
  it('when the candidate is higher, should be true', () => {
    expect(isNewerVersion('0.3.0', '0.2.0')).toBe(true);
  });

  it('when the candidate is the same or lower, should be false', () => {
    expect(isNewerVersion('0.2.0', '0.2.0')).toBe(false);
    expect(isNewerVersion('0.1.9', '0.2.0')).toBe(false);
  });

  it('when either side is not a valid version, should be false', () => {
    expect(isNewerVersion('abc', '0.2.0')).toBe(false);
    expect(isNewerVersion('0.3.0', 'dev')).toBe(false);
  });
});
