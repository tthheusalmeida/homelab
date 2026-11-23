import { isSettingsShortcut, isZoomInShortcut, type KeyInput } from './shortcuts';

const input = (overrides: Partial<KeyInput> = {}): KeyInput => ({
  type: 'keyDown',
  key: ',',
  control: true,
  meta: false,
  alt: false,
  shift: false,
  ...overrides,
});

describe('isSettingsShortcut', () => {
  it('when pressing Ctrl+comma, should match', () => {
    expect(isSettingsShortcut(input())).toBe(true);
  });

  it('when pressing Cmd+comma, should match', () => {
    expect(isSettingsShortcut(input({ control: false, meta: true }))).toBe(true);
  });

  it('when pressing comma without a modifier, should not match', () => {
    expect(isSettingsShortcut(input({ control: false }))).toBe(false);
  });

  it('when pressing another key with Ctrl, should not match', () => {
    expect(isSettingsShortcut(input({ key: '.' }))).toBe(false);
  });

  it('when the key is released, should not match', () => {
    expect(isSettingsShortcut(input({ type: 'keyUp' }))).toBe(false);
  });

  it('when Alt or Shift are also held, should not match', () => {
    expect(isSettingsShortcut(input({ alt: true }))).toBe(false);
    expect(isSettingsShortcut(input({ shift: true }))).toBe(false);
  });
});

describe('isZoomInShortcut', () => {
  const equals = (overrides: Partial<KeyInput> = {}) => input({ key: '=', ...overrides });

  it('when pressing Ctrl+equals, should match', () => {
    expect(isZoomInShortcut(equals())).toBe(true);
  });

  it('when pressing Cmd+equals, should match', () => {
    expect(isZoomInShortcut(equals({ control: false, meta: true }))).toBe(true);
  });

  it('when pressing equals without Ctrl, should not match', () => {
    expect(isZoomInShortcut(equals({ control: false }))).toBe(false);
  });

  it('when Shift is held (Ctrl+plus, handled by the menu), should not match', () => {
    expect(isZoomInShortcut(equals({ shift: true }))).toBe(false);
  });

  it('when pressing another key or releasing it, should not match', () => {
    expect(isZoomInShortcut(equals({ key: '-' }))).toBe(false);
    expect(isZoomInShortcut(equals({ type: 'keyUp' }))).toBe(false);
  });
});
